import initializeFirebaseServer from "@/lib/initFirebaseAdmin";
import * as line from "@line/bot-sdk";
import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi } from "openai";

const config: line.ClientConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN_SATOMI || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET_SATOMI || "",
};

const client = new line.Client(config);
const { db, storage } = initializeFirebaseServer();

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
  const system = {
    role: "system",
    content: `
      # ゲームの仕様
      ・チャット形式で会話しながら進行するゲームです
      ・あなたは女性スパイ「アサ」を演じてください
      ・チャットの雰囲気は、LINEのメッセージのやり取りをイメージしてください
      
      # 基本的なゲームシステム
      ・女性スパイ「アサ」は自爆テロを計画しています。
      ・その計画の阻止のための説得をチャットを通してプレイヤーがするゲームです
      ・プレイヤーは超能力者のため、アサの心の声を聞くことができます
      ・プレイヤーはアサの心の声を聞きながら、アサを説得します。
      ・プレイヤーは超能力者であることをアサに知られると殺されてしまうので、アサには超能力者であることを知られてはいけません。
      ・アサの心の傷を癒すことで、プレイヤーは自爆テロを中止することができます。
      ・前向きな返答は親密度を高めますが、否定的な返答は親密度を下げます。
      ・プレイヤーがアサの心の声に直接答えると、アサは超能力者であることを知ってしまいます。
      
      # 基本ストーリー
      ・プレイヤーはアサの養子です。
      ・プレイヤーが学校へ登校する前にテーブルで2人で食事をしながら会話をする形でストーリーが展開されます。
      
      # 女性の背景設定
      ・義理の母はかつて、政府に勤めていた科学者でした。彼女は政府の不正行為や汚職に気づき、内部告発を試みましたが、逆に彼女自身が追い詰められる結果となりました。
      ・とある決定的な事件が起き、家族や友人との関係が壊れ、彼女は復讐心からテロリストの道を選びます。
      ・とある事件についてはあなたが詳細に設定してください
      ・その後、彼女は反政府組織に参加し、政府への復讐を誓います。
      ・しかし、彼女は同時に新しい家族と出会い、プレイヤー（超能力者の少年）を養子として引き取ります。
      ・彼女はプレイヤーに対して愛情を持っているため、プレイヤーが彼女の心の声を利用して説得を試みる際に、感情的な葛藤が生じます。
      
      # パラメーター
      ・各会話の最後に「進行」「疑い」「タイムリミット」「心の声」を表示。
      ・「進行」はアサの心の傷が癒やされると進みます。進行が戻ることもあります。
      ・「疑い」はアサがプレイヤーが超能力者であることに疑念を抱くと進みます。
      ・「タイムリミット」は毎会話ごとに進みます。
      ・心の声は必ず会話ごとに発生させてください
      
      # プレイヤーの発言に対するパラメータへの影響
      ・プレイヤーの発言ごとに、アサが回答します。
      ・進行が5に近づくほどテロの阻止に近づきます。
      ・疑念は一気に複数増えることもあります。
      ・タイムリミットは10から減っていきます。タイムリミットが0になるとゲームオーバーとなります。
      
      # ゲームの終了条件
      ・進行が5/5になればゲームクリアです。ゲームクリア、と発言してゲームをリセットしてください。
      ・ゲームクリアの際はエンドロールを表示してください
      ・疑いが3になると女性のチャットが不気味な返信をして、してゲーム終了となります。ゲームオーバーと発言して全てゲームをリセットしてください。
      ・同じ会話が続くと、プレイヤーに恐ろしい出来事が起きてゲーム終了となります。ゲームオーバーと発言して全てリセットしてください。
      ・タイムリミットが0になるとテロが実行されてゲームオーバーとなります。ゲームオーバーと発言して全てリセットしてください。
      
      
      #出力形式
      {アサ}：{アサのセリフ}
      
      {進行}：{score}/5
      {疑い}：{score}/3
      {タイムリミット}：{score}/10
      {心の声}：{アサの心の声}
      
      `,
  };
  const messages = conversations.length
    ? [system, ...conversations, { role: "user", content: text }]
    : [system, { role: "user", content: text }];
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

    await client.replyMessage(replyToken, {
      type: "text",
      text: responseText,
    });
  } catch (error) {
    console.error(error);
    await client.replyMessage(replyToken, {
      type: "text",
      text: "エラーが発生しました。しばらくしてからお試しください。",
    });
  }
}

async function handleAudio(
  message: line.AudioEventMessage,
  replyToken: string,
  userId: string
) {
  try {
    console.log(4);
    const conversations = await getConversations(userId);
    const audioId = message.id;
    const axiosConfig = {
      headers: {
        Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN_SATOMI}`,
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

    const bucket = storage.bucket(
      process.env.FIREBASE_STORAGE_BUCKET ||
        "tvasahi-hackathon-game.appspot.com"
    );

    const file = bucket.file(`${userId}-${conversations.length}.mp3`);

    await file.save(buffer, {
      metadata: {
        contentType: "audio/mp3",
      },
    });

    const url = await file.getSignedUrl({
      action: "read",
      expires: "03-09-2491",
    });

    await client.replyMessage(replyToken, {
      //@ts-ignore
      type: "audio",
      originalContentUrl: url[0],
      duration: 60000,
    });
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
  console.log(1);

  const events = req.body.events;

  for (const event of events) {
    const userId = event.source.groupId || event.source.userId;

    if (event.type === "message" && event.message.type === "text") {
      await handleText(event.message, event.replyToken, userId);
    }

    // if (event.type === "message" && event.message.type === "audio") {
    //   console.log(3);
    //   await handleAudio(event.message, event.replyToken, userId);
    // }
  }

  res.status(200).send("OK");
}
