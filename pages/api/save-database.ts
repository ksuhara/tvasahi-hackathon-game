// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

import initializeFirebaseServer from "../../lib/initFirebaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { idToken, voice, situation } = JSON.parse(req.body);
  console.log(idToken, voice, situation);
  const { db } = initializeFirebaseServer();
  const data = new URLSearchParams();
  data.append("id_token", idToken);
  data.append("client_id", process.env.LINE_CLIENT_ID || "");
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

  const userRef = db.ref(`users/${userId}/voice`);
  await userRef.set(voice);
  const situationRef = db.ref(`users/${userId}/situation`);
  await situationRef.set(situation);

  res.status(200).json("success");
}
