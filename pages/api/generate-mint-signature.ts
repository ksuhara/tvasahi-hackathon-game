// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

import { contractAddress } from "../../lib/constant";
import initializeFirebaseServer from "../../lib/initFirebaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { toAddress, tokenId, idToken } = JSON.parse(req.body);
  const thirdwebSDK = ThirdwebSDK.fromPrivateKey(
    process.env.ADMIN_PRIVATE_KEY as string,
    "scroll-alpha-testnet"
  );

  const { db } = initializeFirebaseServer();

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

  const questRef = db.ref(`users/${userId}/quest/${tokenId}`);
  const questSnapshot = await questRef.once("value");
  const quest = questSnapshot.val();
  if (!quest) {
    res.status(400).send({ error: "user cannot mint this nft" });
    return;
  }

  if (!quest?.isCompleted || quest?.isMinted) {
    res.status(400).send({ error: "the wallet has already minted this SBT" });
    return;
  }

  const signatureDrop = await thirdwebSDK.getContract(contractAddress);
  const mintSignature =
    await signatureDrop.erc1155.signature.generateFromTokenId({
      tokenId,
      to: toAddress,
      price: "0",
      mintStartTime: new Date(0),
      quantity: 1,
    });
  questRef.update({ ...quest, isMinted: true });
  res.status(200).json(mintSignature);
}
