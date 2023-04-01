import * as line from "@line/bot-sdk";
import { NextApiRequest, NextApiResponse } from "next";

const config: line.ClientConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

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
  const signature = req.headers["x-line-signature"] as string;
  if (
    !line.validateSignature(
      Buffer.from(JSON.stringify(req.body)),
      config.channelSecret!,
      signature
    )
  ) {
    res.status(403).send("Invalid signature");
    return;
  }

  const events = req.body.events;

  for (const event of events) {
    const userId = event.source.userId;

    if (event.type === "message" && event.message.type === "text") {
      await handleText(event.message, event.replyToken, userId);
    }
  }

  res.status(200).send("OK");
}
