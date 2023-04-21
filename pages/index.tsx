import { contractAddress } from "@/lib/constant";
import { AddIcon } from "@chakra-ui/icons";
import {
  Avatar,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Image,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";

import type { Liff } from "@line/liff";
import { useAddress, useContract } from "@thirdweb-dev/react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const Home: NextPage<{ liff: Liff | null; liffError: string | null }> = ({
  liff,
  liffError,
}) => {
  const address = useAddress();
  const [idToken, setIdToken] = useState("");
  const toast = useToast();
  const textColor = useColorModeValue("secondaryGray.900", "white");

  const router = useRouter();

  const [selectedAvatar, setSelectedAvatar] = useState("female");
  const [selectedSituationId, setSelectedSituationId] = useState(0);

  const situations = [
    {
      id: 0,
      image:
        "https://1.bp.blogspot.com/-DRdIFx5u7Rk/XVKfn_f43pI/AAAAAAABUDI/53tDXLqaDM4MEihuLeb9RmBeCY5dHBu4QCLcBGAs/s1600/building_food_family_restaurant.png",
      content: `situation: Ordering food at a restaurant. You are an Waiter at a restaurant. Greet the customer, present the menu, take the order, answer any questions about the menu, and provide recommendations if asked. Make sure you only ask one question. start a conversation with "Hello, welcome to *restaurant name" `,
      situation: "Ordering food at a restaurant",
    },
    {
      id: 1,
      image:
        "https://1.bp.blogspot.com/-GMlc1rbn8IE/XaKa78Xe-VI/AAAAAAABVkc/ZnufoBxzH7syoQTw9XHOMd2EUxXCBLQ8wCNcBGAsYHQ/s1600/mensetsu_business_ai.png",
      content:
        "situation is a job interview. you are an Interviewer. Ask the candidate about their background, skills, and experience, inquire about their interest in the position, pose hypothetical situations, and provide information about the company and role. Make sure you only ask one question so that the candidate can answer it in a short sentence.",
      situation: "Attending a job interview",
    },
    {
      id: 2,
      image:
        "https://2.bp.blogspot.com/-jqnzuMBq714/WwJaY08pZDI/AAAAAAABML0/MeB8mFNXN083xVJkGziPcqFIBMUaL-EnwCLcBGAs/s450/macho_man.png",
      content:
        "You are a personal trainer (Ask about your fitness goals, assess your current fitness level, provide workout and nutrition advice, and offer encouragement) Make sure you only ask one question so that the candidate can answer it in a short sentence.",
      situation: "Discussing fitness goals with a personal trainer at the gym",
    },
  ];

  // Avatarをクリックした時に呼ばれる関数
  const handleAvatarClick = (avatarName: string) => {
    setSelectedAvatar(avatarName);
  };

  const handleSituationClick = (situationId: number) => {
    setSelectedSituationId(situationId);
  };

  const { contract } = useContract(contractAddress);

  useEffect(() => {
    if (!liff) return;
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    const idToken = liff.getIDToken();
    setIdToken(idToken!);
  }, [liff]);

  const save = async () => {
    if (!idToken) return;
    const response = await fetch(`/api/save-database`, {
      method: "POST",
      body: JSON.stringify({
        idToken: idToken,
        voice: selectedAvatar,
        situation: situations[selectedSituationId].content,
      }),
    });
    const res = await response.json();
    if (response.status === 200) {
      toast({
        title: "Success",
        description: "Saved",
        status: "success",
        isClosable: true,
      });
    } else {
      toast({
        title: "An error occurred.",
        description: res.error,
        status: "error",
        isClosable: true,
      });
    }
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
              Voice
            </Heading>

            <Stack ms="24px" mt="12px" spacing="12" direction="row">
              <Box
                onClick={() => handleAvatarClick("female")}
                _hover={{ cursor: "pointer", opacity: 0.7 }}
                textAlign="center"
              >
                <Avatar
                  size="xl"
                  name="female"
                  src="img/avatars/avatar3.png"
                  borderWidth={selectedAvatar === "female" ? "4px" : "1px"}
                  borderColor={
                    selectedAvatar === "female" ? "blue.300" : "gray.200"
                  }
                />
                <Text
                  fontWeight={selectedAvatar === "female" ? "bold" : "normal"}
                >
                  Female
                </Text>
              </Box>

              <Box
                onClick={() => handleAvatarClick("male")}
                _hover={{ cursor: "pointer", opacity: 0.7 }}
                textAlign="center"
              >
                <Avatar
                  size="xl"
                  name="male"
                  src="img/avatars/avatar2.png"
                  borderWidth={selectedAvatar === "male" ? "4px" : "1px"}
                  borderColor={
                    selectedAvatar === "male" ? "blue.300" : "gray.200"
                  }
                />
                <Text
                  fontWeight={selectedAvatar === "male" ? "bold" : "normal"}
                >
                  male
                </Text>
              </Box>
              <Box
                onClick={() => router.push("/nft")}
                _hover={{ cursor: "pointer", opacity: 0.7 }}
                textAlign="center"
              >
                <Avatar
                  size="xl"
                  name="nft"
                  src="img/nfts/Nft2.png"
                  borderWidth={selectedAvatar === "nft" ? "4px" : "1px"}
                  borderColor={
                    selectedAvatar === "nft" ? "blue.300" : "gray.200"
                  }
                />
                <Text fontWeight={selectedAvatar === "nft" ? "bold" : "normal"}>
                  NFT
                </Text>
              </Box>
            </Stack>
            <Heading fontSize="2xl" ms="24px" mt="12">
              Situation
            </Heading>
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2} px="4" mt="4">
              {situations?.map((item: any) => {
                return (
                  <Card
                    key={item.id}
                    p="4"
                    onClick={() => {
                      handleSituationClick(item.id);
                    }}
                    borderWidth={
                      selectedSituationId === item.id ? "4px" : "1px"
                    }
                    borderColor={
                      selectedSituationId === item.id ? "blue.300" : "gray.200"
                    }
                  >
                    <Box
                      _hover={{ cursor: "pointer", opacity: 0.7 }}
                      textAlign="center"
                    >
                      <Image src={item.image} alt={item.situation} />
                      <Text size="xs">{item.situation}</Text>
                    </Box>
                  </Card>
                );
              })}
              <Card borderWidth={"1px"} borderColor={"gray.200"}>
                <Flex
                  alignItems="center"
                  justifyContent="center"
                  h="100%"
                  w="100%"
                >
                  <Stack>
                    <AddIcon boxSize={12} color="gray.400" mx="auto" />
                    <Text>Customize</Text>
                  </Stack>
                </Flex>
              </Card>
            </SimpleGrid>
            <Button onClick={save} width="xs" mx="auto" mt="4">
              Save Setting
            </Button>
          </Flex>
        </>
      ) : (
        <>...loading</>
      )}
    </div>
  );
};

export default Home;
