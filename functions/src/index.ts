import * as functions from "firebase-functions";
import initializeFirebaseServer from "./initFirebaseAdmin";

import textToSpeech from "@google-cloud/text-to-speech";
import * as line from "@line/bot-sdk";
import axios from "axios";
import { Configuration, OpenAIApi } from "openai";
import {
  menuMessage,
  quickReplyMessageGrade,
  quickReplyMessageJapaneseTranslation,
  quickReplyMessageTranscription,
  situationBoarding,
  situationCompanyInfo,
  situationImigration,
  situationPhoneCall,
} from "../constants/messages";
const { Readable } = require("stream");

const config: line.ClientConfig = {
  channelAccessToken: functions.config().myconfig.line_access_token || "",
  channelSecret: functions.config().myconfig.line_channel_secret || "",
};

const configuration = new Configuration({
  apiKey: functions.config().myconfig.openai_api_key || "",
});
const openai = new OpenAIApi(configuration);

const client = new line.Client(config);

const { db, storage } = initializeFirebaseServer();

export const helloWorld = functions.https.onRequest(
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }
    const events = request.body.events;

    const signature = request.headers["x-line-signature"] as string;
    if (
      !line.validateSignature(
        Buffer.from(JSON.stringify(request.body)),
        config.channelSecret!,
        signature
      )
    ) {
      response.status(403).send("Invalid signature");
      return;
    }

    for (const event of events) {
      const userId = event.source.userId;

      if (event.type === "message" && event.message.type === "text") {
        await handleText(event.message, event.replyToken, userId);
      }

      if (event.type === "message" && event.message.type === "audio") {
        await handleAudio(event.message, event.replyToken, userId);
      }
    }

    response.status(200).send("OK");
  }
);

async function handleAudio(
  message: line.AudioEventMessage,
  replyToken: string,
  userId: string
) {
  try {
    const conversations = await getConversations(userId);
    const audioId = message.id;
    const axiosConfig = {
      headers: {
        Authorization: `Bearer ${
          functions.config().myconfig.line_access_token
        }`,
      },
    };
    const transcoding = await axios.get(
      `https://api-data.line.me/v2/bot/message/${audioId}/content/transcoding`,
      axiosConfig
    );
    console.log(transcoding.data);
    const stream = await client.getMessageContent(audioId);
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    const mp3stream = bufferToReadableStream(buffer, "audio.m4a");

    const transcription = await openai.createTranscription(
      mp3stream,
      "whisper-1",
      undefined,
      "text"
    );

    const situ = await getSituation(userId);

    const system = {
      role: "system",
      content:
        situ ||
        `You are a friend of user. Be friendly as possible, and try to be as natural as possible. try to make your respond short, desireable 1-2 sentences. You can use the previous conversation to help you respond. you should not use the same respond twice. keep the conversation going for 3-5 minutes.`,
    };

    const messages = conversations.length
      ? [
          system,
          ...conversations,
          { role: "user", content: transcription.data },
        ]
      : [system, { role: "user", content: transcription.data }];
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 2048,
    });

    const generatedText = completion.data.choices[0].message?.content.trim();
    const conversationRef = db.ref(`conversations/gogaku/${userId}`);

    await conversationRef.push({ role: "user", content: transcription.data });
    await conversationRef.push({
      role: "assistant",
      content: generatedText,
      // tokenUsed: completion.data.usage?.total_tokens,
    });
    if (!generatedText) return;
    const url = await createAudioUrl(generatedText, userId);

    await replyAudio(replyToken, url!);
  } catch (error: any) {
    console.log("Error:", error.response.data.error);
    await client.replyMessage(replyToken, {
      type: "text",
      text: "エラーが発生しました。しばらくしてからお試しください。",
    });
  }
}

async function handleText(
  message: line.TextEventMessage,
  replyToken: string,
  userId: string
) {
  const userText = message.text;
  if (userText === "添削して") {
    const reviewText = await getReviewOfConversation(userId);
    await client.replyMessage(replyToken, {
      type: "text",
      text: reviewText || "",
    });
  } else if (userText === "transcription") {
    const text = await getNewestConversation(userId);
    await client.replyMessage(replyToken, {
      type: "text",
      text: text || "",
      quickReply: {
        items: [
          quickReplyMessageJapaneseTranslation,
          quickReplyMessageGrade as any,
        ],
      },
    });
  } else if (userText === "日本語訳して") {
    const text = await getNewestConversation(userId);
    const japaneseTranslation = await getJapaneseTranslation(text);
    await client.replyMessage(replyToken, {
      type: "text",
      text: japaneseTranslation || "",
    });
  } else if (userText === "入国審査") {
    await setSituation(userId, situationImigration);
    const generated = await startConversation(userId);
    const audioUrl = await createAudioUrl(generated!, userId);
    await replyAudio(replyToken, audioUrl!);
  } else if (userText === "搭乗手続き") {
    await setSituation(userId, situationBoarding);
    const generated = await startConversation(userId);
    const audioUrl = await createAudioUrl(generated!, userId);
    await replyAudio(replyToken, audioUrl!);
  } else if (userText === "電話対応") {
    await setSituation(userId, situationPhoneCall);
    const generated = await startConversation(userId);
    const audioUrl = await createAudioUrl(generated!, userId);
    await replyAudio(replyToken, audioUrl!);
  } else if (userText === "会社紹介") {
    await setSituation(userId, situationCompanyInfo);
    const generated = await startConversation(userId);
    const audioUrl = await createAudioUrl(generated!, userId);
    await replyAudio(replyToken, audioUrl!);
  } else if (userText === "シチュエーション") {
    await client.replyMessage(replyToken, menuMessage as any);
  }
}

async function getConversations(userId: string) {
  const conversationRef = db.ref(`conversations/gogaku/${userId}`);
  const conversationSnapshot = await conversationRef
    .limitToLast(8)
    .once("value");
  const conversation: any = [];
  conversationSnapshot.forEach(function (childSnapshot) {
    var item = childSnapshot.val();
    conversation.push(item);
  });

  return conversation;
}

async function getSituation(userId: string) {
  const situationRef = db.ref(`users/${userId}/situation`);
  const situationShapshot = await situationRef.once("value");
  const situation = situationShapshot.val();
  return situation || "";
}

async function setSituation(userId: string, situation: string) {
  const situationRef = db.ref(`users/${userId}/situation`);

  await situationRef.set(situation);
}

async function createAudioUrl(text: string, userId: string) {
  const textToSpeechClient = new textToSpeech.TextToSpeechClient({
    projectId: functions.config().myconfig.public_project_id,
    credentials: {
      client_email: functions.config().myconfig.firebase_client_email,
      private_key: (
        functions.config().myconfig.firebase_private_key as string
      ).replace(/\\n/g, "\n"),
    },
  });
  const request = {
    input: { text: text },
    voice: {
      languageCode: "en-US",
      name: "en-US-Neural2-E",
      ssmlGender: "FEMALE" as any,
    },
    audioConfig: {
      audioEncoding: "MP3" as any,
    },
  };
  const [response] = await textToSpeechClient.synthesizeSpeech(request);
  if (!response.audioContent) return;
  const bucket = storage.bucket(
    functions.config().myconfig.firebase_storage_bucket ||
      "tvasahi-hackathon-game.appspot.com"
  );

  const randomNumber = Math.floor(Math.random() * 100000000000000000);

  const file = bucket.file(`${userId}-${randomNumber}.mp3`);

  await file.save(response.audioContent as any, {
    metadata: {
      contentType: "audio/mp3",
    },
  });

  const url = await file.getSignedUrl({
    action: "read",
    expires: "03-09-2491",
  });

  return url[0];
}

async function replyAudio(replyToken: string, url: string) {
  await client.replyMessage(replyToken, {
    //@ts-ignore
    type: "audio",
    originalContentUrl: url,
    duration: 60000,
    quickReply: {
      items: [
        quickReplyMessageTranscription,
        quickReplyMessageJapaneseTranslation as any,
        quickReplyMessageGrade,
      ],
    },
  });
}

async function startConversation(userId: string) {
  const situ = await getSituation(userId);

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          situ ||
          `You are an English tutor. Please ask your student one random quiz question to test their English conversation skills. Make sure the question is in a conversational format so that the student can answer in a conversational manner.`,
      },
    ],
  });
  const generatedText = completion.data.choices[0].message?.content.trim();
  const conversationRef = db.ref(`conversations/gogaku/${userId}`);

  await conversationRef.push({
    role: "assistant",
    content: generatedText,
  });

  return generatedText;
}

async function getReviewOfConversation(userId: string) {
  const conversations = await getConversations(userId);

  const system = {
    role: "system",
    content: `You are an English tutor. You will be given a text of conversations from your student and an AI assistant.  When there are errors in the student's grammar or expression, or when there is a better way to respond, please correct it. If there is no misstake, praise your student. Make sure you only correct the answer from user, not an AI assistant. Respond in the following format:
  
          Your response: ""
          
          Better response: ""
          
          Explanation: ""
        `,
  };
  const completion = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [system, ...conversations],
  });
  const generatedText = completion.data.choices[0].message?.content.trim();

  return generatedText;
}

async function getJapaneseTranslation(text: string) {
  const system = {
    role: "system",
    content: "日本語の訳を入力してください",
  };
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [system as any, { role: "user", content: text }],
  });

  const generatedText = completion.data.choices[0].message?.content.trim();

  return generatedText;
}

async function getNewestConversation(userId: string) {
  const conversationRef = db.ref(`conversations/gogaku/${userId}`);
  const snapshot = await conversationRef.limitToLast(1).once("value");
  let data: any;
  snapshot.forEach((childSnapshot) => {
    data = childSnapshot.val();
  });

  return data.content || "";
}

function bufferToReadableStream(buffer: Buffer, filename: string) {
  const readable = new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    },
  });
  readable.path = filename;
  return readable;
}
