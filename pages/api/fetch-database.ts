// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

import initializeFirebaseServer from "../../lib/initFirebaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { idToken } = JSON.parse(req.body);
  const { db } = initializeFirebaseServer();
  console.log("aaa");
  const data = new URLSearchParams();
  data.append("id_token", idToken);
  data.append("client_id", "1660813476");
  const config = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  const response = await axios.post(
    "https://api.line.me/oauth2/v2.1/verify",
    data,
    config
  );
  const userId = response.data.sub;
  let questList = [];
  for (let i = 0; i < 3; i++) {
    const questRef = db.ref(`users/${userId}/quest/${i}`);
    const questSnapshot = await questRef.once("value");
    const quest = questSnapshot.val();
    questList.push(quest);
  }
  console.log(questList, "questList");

  res.status(200).json({ questList });
}
