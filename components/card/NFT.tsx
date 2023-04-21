// Chakra imports
import {
  AspectRatio,
  Box,
  Button,
  Flex,
  Icon,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
// Custom components
import Card from "../card/Card";
import { Image } from "../image/Image";
// Assets
import { useAddress, useMetamask } from "@thirdweb-dev/react";
import { useState } from "react";
import { IoHeart, IoHeartOutline } from "react-icons/io5";

export default function NFT(props: {
  image: string;
  name: string;
  author: string;
  score: string | number;
  mint: () => void;
  isMintable: boolean;
}) {
  const { image, name, author, score, mint, isMintable } = props;
  const [like, setLike] = useState(false);
  const textColor = useColorModeValue("navy.700", "white");
  const textColorBid = useColorModeValue("brand.500", "white");
  const address = useAddress();
  const connect = useMetamask();
  const handleConnect = async () => {
    if (!window.ethereum) {
      window.open("dapp://tvasahi-hackathon-game.vercel.app/");
    }
    connect();
  };

  return (
    <Card p="20px">
      <Flex direction={{ base: "column" }} justify="center">
        <Box mb={{ base: "20px", "2xl": "20px" }} position="relative">
          <AspectRatio ratio={7 / 5}>
            {/* @ts-ignore */}
            <Image src={image} w={"100%"} borderRadius="20px" alt="" />
          </AspectRatio>
          <Button
            position="absolute"
            bg="white"
            _hover={{ bg: "whiteAlpha.900" }}
            _active={{ bg: "white" }}
            _focus={{ bg: "white" }}
            p="0px !important"
            top="14px"
            right="14px"
            borderRadius="50%"
            minW="36px"
            h="36px"
            onClick={() => {
              setLike(!like);
            }}
          >
            <Icon
              transition="0.2s linear"
              w="20px"
              h="20px"
              as={like ? IoHeart : IoHeartOutline}
              color="brand.500"
            />
          </Button>
        </Box>
        <Flex flexDirection="column" justify="space-between" h="100%">
          <Flex
            justify="space-between"
            direction={{
              base: "row",
              md: "column",
              lg: "row",
              xl: "column",
              "2xl": "row",
            }}
            mb="auto"
          >
            <Flex direction="column">
              <Text
                color={textColor}
                fontSize={{
                  base: "xl",
                  md: "lg",
                  lg: "lg",
                  xl: "lg",
                  "2xl": "md",
                  "3xl": "lg",
                }}
                mb="5px"
                fontWeight="bold"
                me="14px"
              >
                {name}
              </Text>
              <Text
                color="secondaryGray.600"
                fontSize={{
                  base: "sm",
                }}
                fontWeight="400"
                me="14px"
              >
                {author}
              </Text>
            </Flex>
          </Flex>
          <Flex
            align={{
              base: "center",
              md: "start",
              lg: "center",
              xl: "start",
              "2xl": "center",
            }}
            justify="space-between"
            direction={{
              base: "row",
              md: "column",
              lg: "row",
              xl: "column",
              "2xl": "row",
            }}
            mt="5px"
          >
            <Text fontWeight="700" fontSize="sm" color={textColorBid}>
              Score: {score} /10
            </Text>
            {address ? (
              <Button
                colorScheme="purple"
                fontSize="sm"
                fontWeight="500"
                borderRadius="70px"
                px="24px"
                py="5px"
                mt={{
                  base: "0px",
                  md: "10px",
                  lg: "0px",
                  xl: "10px",
                  "2xl": "0px",
                }}
                onClick={mint}
                isDisabled={!isMintable}
              >
                Mint NFT
              </Button>
            ) : (
              <Button onClick={() => handleConnect()}>Connect</Button>
            )}
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}