import initializeFirebaseServer from "@/lib/initFirebaseAdmin";
import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { getUser } from "./auth/[...thirdweb]";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getUser(req);

  if (!user) {
    return res.status(401).json({
      message: "Not authorized.",
    });
  }

  const { idToken } = JSON.parse(req.body);
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

  const { db } = initializeFirebaseServer();
  await db.ref(`users/${userId}/wallet`).set(user.address);

  return res.status(200).json({
    message: `This is a secret for ${user.address}.`,
  });
};

export default handler;
