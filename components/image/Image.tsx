import { Box, ChakraComponent } from "@chakra-ui/react";
import NextImage from "next/image";
import { ComponentProps } from "react";

// @ts-ignore
interface ImageProps extends ComponentProps<ChakraComponent<"div", {}>> {}

export const Image = (props: ImageProps) => {
  // @ts-ignore
  const { src, alt, ...rest } = props;
  return (
    <Box overflow={"hidden"} position="relative" {...rest}>
      <NextImage objectFit="cover" layout="fill" src={src} alt={alt} />
    </Box>
  );
};
