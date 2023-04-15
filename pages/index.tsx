import NFT from "@/components/card/NFT";
import { contractAddress } from "@/lib/constant";
import {
  Flex,
  SimpleGrid,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import type { Liff } from "@line/liff";
import { useAddress, useContract } from "@thirdweb-dev/react";
import type { NextPage } from "next";
import { useEffect, useState } from "react";

const Home: NextPage<{ liff: Liff | null; liffError: string | null }> = ({
  liff,
  liffError,
}) => {
  const address = useAddress();
  const [idToken, setIdToken] = useState("");
  const toast = useToast();
  const [quest, setQuest] = useState<any>();
  const textColor = useColorModeValue("secondaryGray.900", "white");

  const { contract } = useContract(contractAddress);

  useEffect(() => {
    if (!liff) return;
    const fn = async () => {
      if (!liff.isLoggedIn()) {
        liff.login();
      }
      const idToken = liff.getIDToken();
      setIdToken(idToken!);
    };
    fn();
  }, [liff]);

  useEffect(() => {
    if (!idToken) return;
    const fn = async () => {
      const response = await fetch(`/api/fetch-database`, {
        method: "POST",
        body: JSON.stringify({
          idToken: idToken,
        }),
      });
      const quest = await response.json();
      console.log(quest, "quest");
      setQuest(quest.questList);
    };
    fn();
  }, [idToken]);

  const mint = async (tokenId: string) => {
    const response = await fetch(`/api/generate-mint-signature`, {
      method: "POST",
      body: JSON.stringify({
        toAddress: address,
        tokenId,
        idToken: idToken,
      }),
    });
    const signedPayload = await response.json();
    if (response.ok) {
      try {
        console.log(contract, "contract");
        const nft = await contract?.erc1155.signature.mint(signedPayload);
      } catch (error: any) {
        alert(error?.message);
      } finally {
      }
    } else {
      toast({
        title: "An error occurred.",
        description: signedPayload.error,
        status: "error",
        isClosable: true,
      });
    }
  };

  return (
    <div>
      {liff ? (
        <>
          <Flex direction="column">
            <Flex
              mt="45px"
              mb="20px"
              justifyContent="space-between"
              direction={{ base: "column", md: "row" }}
              align={{ base: "start", md: "center" }}
            >
              <Text color={textColor} fontSize="2xl" ms="24px" fontWeight="700">
                GOGAKU!!!
              </Text>
            </Flex>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap="20px">
              <NFT
                name="Quest 1"
                author="By Esthera Jackson"
                image={"/img/nfts/Nft1.png"}
                score={quest?.[0]?.score || 0}
                mint={() => mint("0")}
                isMintable={quest?.[0].isCompleted}
              />
              <NFT
                name="Quest 2"
                author="By Nick Wilson"
                image={"/img/nfts/Nft2.png"}
                score={quest?.[1]?.score || 0}
                mint={() => mint("1")}
                isMintable={quest?.[1]?.isCompleted}
              />
              <NFT
                name="Quest 3 "
                author="By Will Smith"
                image={"/img/nfts/Nft3.png"}
                score={quest?.[2]?.score || 0}
                mint={() => mint("2")}
                isMintable={quest?.[2]?.isCompleted}
              />
            </SimpleGrid>
          </Flex>
        </>
      ) : (
        <>...loading</>
      )}
    </div>
  );
};

export default Home;
