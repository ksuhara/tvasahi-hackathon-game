import initializeFirebaseServer from "@/lib/initFirebaseAdmin";
import * as line from "@line/bot-sdk";
import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi } from "openai";
const { Readable, Writable } = require("stream");

const config: line.ClientConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN_ENGLISH || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET_ENGLISH || "",
};

const { db, storage } = initializeFirebaseServer();

async function getConversations(userId: string) {
  const conversationRef = db.ref(`conversations/english/${userId}`);
  const conversationSnapshot = await conversationRef.once("value");
  const conversation: any = [];

  conversationSnapshot.forEach(function (childSnapshot) {
    var item = childSnapshot.val();
    conversation.push(item);
  });

  return conversation;
}

const client = new line.Client(config);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const events = req.body.events;

  for (const event of events) {
    const userId = event.source.userId;

    if (event.type === "message" && event.message.type === "audio") {
      await handleAudio(event.message, event.replyToken, userId);
    }
  }

  res.status(200).send("ok");
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
        Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN_ENGLISH}`,
      },
    };
    const transcoding = await axios.get(
      `https://api-data.line.me/v2/bot/message/${audioId}/content/transcoding`,
      axiosConfig
    );
    console.log(transcoding, "transcoding");
    const stream = await client.getMessageContent(audioId);
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // const bucket = storage.bucket(
    //   process.env.FIREBASE_STORAGE_BUCKET ||
    //     "tvasahi-hackathon-game.appspot.com"
    // );

    // const file = bucket.file(`${userId}.mp3`);

    // await file.save(buffer, {
    //   metadata: {
    //     contentType: "audio/mp3",
    //   },
    // });

    // const url = await file.getSignedUrl({
    //   action: "read",
    //   expires: "03-09-2491",
    // });

    // const response = await axios.get(url[0], { responseType: "arraybuffer" });
    // const mp3Buffer = Buffer.from(response.data);

    const mp3stream = bufferToReadableStream(buffer, "audio.mp3");

    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    const transcription = await openai.createTranscription(
      mp3stream,
      "whisper-1",
      undefined,
      "text"
    );

    console.log(transcription, "test");

    const system = {
      role: "system",
      content: `You are an English tutor. Try to continue the conversation so that it expands when the student comes to talk. When there are errors in the student's grammar or expression, or when there is a better way to respond, please respond in the following format:

        Conversation: ""
        
        Your response: ""
        
        Better response: ""
        
        Explanation: ""`,
    };

    const messages = conversations.length
      ? [
          system,
          ...conversations,
          { role: "user", content: transcription.data },
        ]
      : [system, { role: "user", content: transcription.data }];
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: messages,
    });

    const generatedText = completion.data.choices[0].message?.content.trim();
    const conversationRef = db.ref(`conversations/english/${userId}`);

    await conversationRef.push({ role: "user", content: transcription.data });
    await conversationRef.push({ role: "assistant", content: generatedText });

    // await client.replyMessage(replyToken, {
    //   //@ts-ignore
    //   type: "audio",
    //   originalContentUrl: url[0],
    //   duration: 60000,
    // });
    await client.replyMessage(replyToken, {
      type: "text",
      text: generatedText || "",
    });
  } catch (error: any) {
    console.log("Error:", error.response.data.error);
    await client.replyMessage(replyToken, {
      type: "text",
      text: "エラーが発生しました。しばらくしてからお試しください。",
    });
  }
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
