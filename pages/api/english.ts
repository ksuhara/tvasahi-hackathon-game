import initializeFirebaseServer from "@/lib/initFirebaseAdmin";
import textToSpeech from "@google-cloud/text-to-speech";
import * as line from "@line/bot-sdk";
import { NextApiRequest, NextApiResponse } from "next";

const config: line.ClientConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

const { storage } = initializeFirebaseServer();

const client = new line.Client(config);

async function handleText(
  message: line.TextEventMessage,
  replyToken: string,
  userId: string
) {
  const userText = message.text;

  try {
    const answer = "これが返ってきたら接続完了";

    await client.replyMessage(replyToken, { type: "text", text: answer });
  } catch (error) {
    console.error(error);
    await client.replyMessage(replyToken, {
      type: "text",
      text: "エラーが発生しました。しばらくしてからお試しください。",
    });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY as string).replace(
    /\\n/g,
    "\n"
  );
  const text = "こんにちは。私の名前はアリスです。";
  const client = new textToSpeech.TextToSpeechClient({
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: privateKey,
    },
  });
  const request = {
    input: { text },
    voice: {
      languageCode: "ja-jp",
      name: "ja-JP-Standard-A",
      ssmlGender: "FEMALE" as any,
    },
    audioConfig: {
      audioEncoding: "MP3" as any,
    },
  };

  const [response] = await client.synthesizeSpeech(request);
  console.log(response);
  if (!response.audioContent) return;

  // save the audio file to the bucket
  const bucket = storage.bucket(
    process.env.FIREBASE_STORAGE_BUCKET || "tvasahi-hackathon-game.appspot.com"
  ); // バケット名 (gs://<BUCKET_NAME>/) から <BUCKET_NAME> を取得

  const file = bucket.file("test2.mp3");

  await file.save(response.audioContent as any, {
    metadata: {
      contentType: "audio/mp3",
    },
  });

  const url = await file.getSignedUrl({
    action: "read",
    expires: "03-09-2491",
  });

  console.log(url);

  res.status(200).send(url);
}
