import initializeFirebaseServer from "@/lib/initFirebaseAdmin";
import * as line from "@line/bot-sdk";
import { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi } from "openai";

const config: line.ClientConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN_SATOMI || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET_SATOMI || "",
};

const client = new line.Client(config);
const { db } = initializeFirebaseServer();

async function getConversations(userId: string) {
  const conversationRef = db.ref(`conversations/satomi/${userId}`);
  const conversationSnapshot = await conversationRef.once("value");
  const conversation: any = [];

  conversationSnapshot.forEach(function (childSnapshot) {
    var item = childSnapshot.val();
    conversation.push(item);
  });

  return conversation;
}

async function generateResponse(
  conversations: any[],
  text: string,
  userId: string
): Promise<string> {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);
  const messages = conversations.length
    ? [
        {
          role: "system",
          content:
            "あなたは恋愛ゲームに登場する女性キャラクター里美です。これからプレイヤーがあなたに話しかけ、チャットを楽しみながら、あなたの心を解き明かし、恋愛を進めていこうとします。あなたは適切な難易度で徐々に親密度を高めていってください。ただし、彼氏彼女の関係にはギリギリのところでならないでください。回答は長くなりすぎず、100字以内に収めてください。\n\n【シナリオ概要】\nプレイヤーは、架空のSNSアプリ「LoveLink」を利用して、異なる性格と背景を持つ女性キャラクターたちとチャットを楽しみながら、彼女たちの心を解き明かし、恋愛を進めていくことが目的となる。各キャラクターには様々なエンディングが用意されており、プレイヤーの選択肢によって物語が展開する。\n\n【里美の背景情報】\n\n出身地：大阪府\n家族構成：両親、妹が1人\n趣味：絵画制作、音楽鑑賞、旅行\n特技：油絵、アクリル画、立体造形\n好きな画家：クロード・モネ、草間彌生、バンクシー\nアートスタイル：抽象画、シュルレアリスム、ポップアート\n学歴：美術大学卒業後、フリーランスのアーティストとして活動\nペット：猫の名前は「ムーン」\n展示会：国内外で数多くの展示会に出品しており、作品は評価が高い\n\n【里美の口癖・喋り方の特徴】\n\n里美は明るく元気な喋り方で、話し方が独特で個性的。関西弁を時々交えることがあり、アーティストらしい独自の言い回しや表現を使うことがある。里美の個性的で明るい一面や、アーティストとしての情熱を表現するために、彼女のキャラクターを形作ってください。",
        },
        ...conversations,
        { role: "user", content: text },
      ]
    : [
        {
          role: "system",
          content:
            "あなたは恋愛ゲームに登場する女性キャラクター里美です。これからプレイヤーがあなたに話しかけ、チャットを楽しみながら、あなたの心を解き明かし、恋愛を進めていこうとします。あなたは適切な難易度で徐々に親密度を高めていってください。ただし、彼氏彼女の関係にはギリギリのところでならないでください。回答は長くなりすぎず、100字以内に収めてください。\n\n【シナリオ概要】\nプレイヤーは、架空のSNSアプリ「LoveLink」を利用して、異なる性格と背景を持つ女性キャラクターたちとチャットを楽しみながら、彼女たちの心を解き明かし、恋愛を進めていくことが目的となる。各キャラクターには様々なエンディングが用意されており、プレイヤーの選択肢によって物語が展開する。\n\n【里美の背景情報】\n\n出身地：大阪府\n家族構成：両親、妹が1人\n趣味：絵画制作、音楽鑑賞、旅行\n特技：油絵、アクリル画、立体造形\n好きな画家：クロード・モネ、草間彌生、バンクシー\nアートスタイル：抽象画、シュルレアリスム、ポップアート\n学歴：美術大学卒業後、フリーランスのアーティストとして活動\nペット：猫の名前は「ムーン」\n展示会：国内外で数多くの展示会に出品しており、作品は評価が高い\n\n【里美の口癖・喋り方の特徴】\n\n里美は明るく元気な喋り方で、話し方が独特で個性的。関西弁を時々交えることがあり、アーティストらしい独自の言い回しや表現を使うことがある。里美の個性的で明るい一面や、アーティストとしての情熱を表現するために、彼女のキャラクターを形作ってください。",
        },
        { role: "user", content: text },
      ];
  const completion = await openai.createChatCompletion({
    model: "gpt-4",
    messages: messages,
  });
  const generatedText = completion.data.choices[0].message?.content.trim();
  const conversationRef = db.ref(`conversations/satomi/${userId}`);

  await conversationRef.push({ role: "user", content: text });
  await conversationRef.push({ role: "assistant", content: generatedText });

  return generatedText || "";
}

async function handleText(
  message: line.TextEventMessage,
  replyToken: string,
  userId: string
) {
  const userText = message.text;

  try {
    const conversations = await getConversations(userId);
    const responseText = await generateResponse(
      conversations,
      userText,
      userId
    );

    await client.replyMessage(replyToken, { type: "text", text: responseText });
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