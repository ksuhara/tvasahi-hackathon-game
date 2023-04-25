import initializeFirebaseServer from "@/lib/initFirebaseAdmin";
import textToSpeech from "@google-cloud/text-to-speech";
import * as line from "@line/bot-sdk";
import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi } from "openai";
const { Readable, Writable } = require("stream");

const config: line.ClientConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN_GOGAKU || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET_GOGAKU || "",
};

const { db, storage } = initializeFirebaseServer();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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

async function getVoiceSetting(userId: string) {
  const voiceRef = db.ref(`users/${userId}/voice`);
  const voiceSnapshot = await voiceRef.once("value");
  const voice = voiceSnapshot.val();
  return voice;
}

async function getSituation(userId: string) {
  const situationRef = db.ref(`users/${userId}/situation`);
  const situationShapshot = await situationRef.once("value");
  const situation = situationShapshot.val();
  return situation;
}

const client = new line.Client(config);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const events = req.body.events;

  for (const event of events) {
    const userId = event.source.userId;

    if (event.type === "message" && event.message.type === "text") {
      await handleText(event.message, event.replyToken, userId);
    }

    if (event.type === "message" && event.message.type === "audio") {
      await handleAudio(event.message, event.replyToken, userId);
    }
  }

  res.status(200).send("ok");
}

async function createQuiz(userId: string) {
  const situ = await getSituation(userId);
  console.log(situ);

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

  return generatedText;
}

async function createAudioUrl(text: string, userId: string) {
  const textToSpeechClient = new textToSpeech.TextToSpeechClient({
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: (process.env.FIREBASE_PRIVATE_KEY as string).replace(
        /\\n/g,
        "\n"
      ),
    },
  });
  const voice = await getVoiceSetting(userId);
  const request = {
    input: { text: text },
    voice: {
      languageCode: "en-US",
      name: voice === "male" ? "en-US-Neural2-J" : "en-US-Neural2-E",
      ssmlGender: voice === "male" ? ("MALE" as any) : ("FEMALE" as any),
    },
    audioConfig: {
      audioEncoding: "MP3" as any,
    },
  };
  const [response] = await textToSpeechClient.synthesizeSpeech(request);
  if (!response.audioContent) return;
  const bucket = storage.bucket(
    process.env.FIREBASE_STORAGE_BUCKET || "tvasahi-hackathon-game.appspot.com"
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

async function handleText(
  message: line.TextEventMessage,
  replyToken: string,
  userId: string
) {
  const userText = message.text;
  const conversationRef = db.ref(`conversations/gogaku/${userId}`);
  if (userText === "Let's talk!") {
    const quizeText = await createQuiz(userId);
    if (!quizeText) return;

    await conversationRef.push({ role: "assistant", content: quizeText });
    const url = await createAudioUrl(quizeText, userId);

    await client.replyMessage(replyToken, {
      //@ts-ignore
      type: "audio",
      originalContentUrl: url,
      duration: 60000,
    });
  } else if (userText === "Grade my conversation!") {
    const reviewText = await getReviewOfConversation(userId);
    await client.replyMessage(replyToken, {
      type: "text",
      text: reviewText || "",
    });
    // await conversationRef.remove();
  } else if (userText === "transcription") {
    const text = await getNewestConversation(userId);
    await client.replyMessage(replyToken, {
      type: "text",
      text: text || "",
      quickReply: {
        items: [
          {
            type: "action",
            action: {
              type: "message",
              label: "日本語訳",
              text: "日本語訳",
            },
          },
        ],
      },
    });
  } else if (userText === "日本語訳") {
    const text = await getNewestConversation(userId);
    const japaneseTranslation = await getJapaneseTranslation(text);
    await client.replyMessage(replyToken, {
      type: "text",
      text: japaneseTranslation || "",
    });
  }
}

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
        Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN_GOGAKU}`,
      },
    };
    console.log(audioId, "audioId");
    console.log(axiosConfig, "axiosConfig");
    const transcoding = await axios.get(
      `https://api-data.line.me/v2/bot/message/${audioId}/content/transcoding`,
      axiosConfig
    );
    console.log(transcoding);
    const stream = await client.getMessageContent(audioId);
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    const mp3stream = bufferToReadableStream(buffer, "audio.mp3");

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
    });

    const generatedText = completion.data.choices[0].message?.content.trim();
    const conversationRef = db.ref(`conversations/gogaku/${userId}`);

    await conversationRef.push({ role: "user", content: transcription.data });
    await conversationRef.push({ role: "assistant", content: generatedText });
    if (!generatedText) return;
    const url = await createAudioUrl(generatedText, userId);

    await client.replyMessage(replyToken, {
      //@ts-ignore
      type: "audio",
      originalContentUrl: url,
      duration: 60000,
      quickReply: {
        items: [
          {
            type: "action",
            action: {
              type: "message",
              label: "transcription",
              text: "transcription",
            },
          },
          {
            type: "action",
            action: {
              type: "message",
              label: "日本語訳",
              text: "日本語訳",
            },
          },
        ],
      },
    });
  } catch (error: any) {
    console.log("Error:", error.response.data.error);
    await client.replyMessage(replyToken, {
      type: "text",
      text: "エラーが発生しました。しばらくしてからお試しください。",
    });
  }
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
