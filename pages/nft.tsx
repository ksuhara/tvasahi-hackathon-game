import {
  Button,
  Card,
  Flex,
  Heading,
  Image,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { EvmChain } from "@moralisweb3/evm-utils";
import Moralis from "moralis";

import type { Liff } from "@line/liff";
import { useAddress, useContract, useMetamask } from "@thirdweb-dev/react";
import type { NextPage } from "next";
import { useEffect, useState } from "react";

const NFT: NextPage<{ liff: Liff | null; liffError: string | null }> = ({
  liff,
  liffError,
}) => {
  const address = useAddress();
  const [idToken, setIdToken] = useState("");
  const toast = useToast();
  const textColor = useColorModeValue("secondaryGray.900", "white");

  const [nfts, setNfts] = useState<any[]>([]);

  const { contract } = useContract(
    "0xdb6F6f88b32793349CA121421777a7615c4B8848"
  );

  useEffect(() => {
    if (!liff) return;
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    const idToken = liff.getIDToken();
    setIdToken(idToken!);
  }, [liff]);

  const connect = useMetamask();

  useEffect(() => {
    const fn = async () => {
      if (!address) return;
      if (!Moralis.Core.isStarted) {
        await Moralis.start({
          apiKey: process.env.NEXT_PUBLIC_MORALIS_API_KEY || "",
        });
      }
      const response = await Moralis.EvmApi.nft.getWalletNFTs({
        tokenAddresses: ["0xdb6F6f88b32793349CA121421777a7615c4B8848"],
        address: address as string,
        chain: EvmChain.GOERLI,
      });

      setNfts(response.result);
    };
    fn();
  }, [address]);

  const save = async () => {
    toast({
      title: "saved!",
      status: "success",
      isClosable: true,
    });
  };

  return (
    <div>
      {liff ? (
        <>
          <Flex
            mt="45px"
            mb="20px"
            justifyContent="space-between"
            direction={{ base: "column" }}
            align={{ base: "start", md: "center" }}
          >
            <Text color={textColor} fontSize="2xl" ms="24px" fontWeight="700">
              GOGAKU!!!
            </Text>
            <Heading fontSize="2xl" ms="24px" mt="4">
              Set NFT as your AI voice
            </Heading>
            {address ? (
              <Text>{address}</Text>
            ) : (
              <Button onClick={() => connect()}>Connect</Button>
            )}
            {nfts.map((nft) => {
              return (
                <Card key={nft.tokenId} width="70%" mx="auto" rounded="md">
                  <Image
                    src={nft.metadata.image.replace(
                      "ipfs://",
                      "https://gateway.ipfscdn.io/ipfs/"
                    )}
                    alt={nft.metadata.name}
                  ></Image>
                  <Text>{nft.metadata.name}</Text>
                </Card>
              );
            })}
            <Button onClick={save} mx="auto" mt="8">
              Set NFT
            </Button>
          </Flex>
        </>
      ) : (
        <>...loading</>
      )}
    </div>
  );
};

export default NFT;
