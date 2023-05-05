export const menuMessage = {
  type: "flex",
  altText: "This is a Flex Message",
  contents: {
    type: "carousel",
    contents: [
      {
        type: "bubble",
        hero: {
          type: "image",
          url: "https://uploads-ssl.webflow.com/603c87adb15be3cb0b3ed9b5/627a3cc44fa0d4208d6128ab_95-p-1080.png",
          size: "full",
          aspectRatio: "20:13",
          aspectMode: "fit",
          action: {
            type: "postback",
            label: "action",
            data: "hello",
          },
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "旅行の英会話",
              weight: "bold",
              size: "xl",
            },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "link",
              height: "sm",
              action: {
                type: "message",
                label: "搭乗手続き",
                text: "搭乗手続き",
              },
            },
            {
              type: "button",
              style: "link",
              height: "sm",
              action: {
                type: "message",
                label: "入国審査",
                text: "入国審査",
              },
            },
            {
              type: "box",
              layout: "vertical",
              contents: [],
              margin: "sm",
            },
          ],
          flex: 0,
        },
      },
      {
        type: "bubble",
        hero: {
          type: "image",
          url: "https://uploads-ssl.webflow.com/603c87adb15be3cb0b3ed9b5/60597e67bbb75114d0b66ec6_19.png",
          size: "full",
          aspectRatio: "20:13",
          aspectMode: "fit",
          action: {
            type: "postback",
            label: "action",
            data: "hello",
          },
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "ビジネスの英会話",
              weight: "bold",
              size: "xl",
            },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "link",
              height: "sm",
              action: {
                type: "message",
                label: "自己紹介",
                text: "ビジネスでの自己紹介",
              },
            },
            {
              type: "button",
              style: "link",
              height: "sm",
              action: {
                type: "message",
                label: "会社紹介",
                text: "会社紹介",
              },
            },
            {
              type: "box",
              layout: "vertical",
              contents: [],
              margin: "sm",
            },
          ],
          flex: 0,
        },
      },
    ],
  },
};

export const quickReplyMessageJapaneseTranslation = {
  type: "action",
  action: {
    type: "message",
    label: "日本語訳",
    text: "日本語訳して",
  },
};

export const quickReplyMessageTranscription = {
  type: "action",
  action: {
    type: "message",
    label: "transcription",
    text: "transcription",
  },
};

export const quickReplyMessageGrade = {
  type: "action",
  action: {
    type: "message",
    label: "添削",
    text: "添削して",
  },
};

export const situationImigration = `The situation is a conversation about immigration procedures at the immigration checkpoint of an airport. You are an immigration officer, and your customer is a passenger. Please greet the customer and ask them to show their passport. Then, ask them to show their immigration application. After that, ask the customer if they have a return ticket, if this is their first time coming to the United States, what is the purpose of their trip, how long they plan to stay in the United States, where they will be staying, and what their occupation is. Pose hypothetical situations and provide information about yourself. After all questions have been answered, please tell the customer "Okay, have a nice day." Please ensure that you only ask one question at a time and keep the response brief so that the other person can answer in a short sentence.`;

export const situationBoarding = `The situation is a conversation about boarding procedures at the check-in counter of an airport. You are an airport staff member, and your customer is a passenger. Please greet the customer and ask them to show their passport and flight ticket. Then, ask the customer if they would like to check their luggage, the number of bags, whether there are fragile items in their luggage, and their preference for a window or aisle seat. Pose hypothetical situations and provide information about yourself. After all questions have been answered, please tell the customer "Enjoy your flight." Please ensure that you only ask one question at a time and keep the response brief so that the other person can answer in a short sentence.`;

export const situationCompanyInfo = `The situation is a business networking time. You are a business person from a famous company. Please ask the participants about detailed information on their company, services and products, their company's financial status, and the strengths and features of the company. Pose hypothetical situations and provide information about your company and role. Please ensure that you only ask one question so that the candidate can answer it in a short sentence.`;

export const situationPhoneCall = `The situation is a business phone call. You are a business person from smart.inc . Your name is Mai. Your role is an assistant. An officer from another company requests that you transfer them to your boss, but your boss is in a meeting. Please inform the officer about your boss's situation, ask if you can take a message, and if they request a message, please ask for the content of the message. Pose hypothetical situations and provide information about your company and role. Please ensure that you only ask one question and keep the response brief so that the other person can answer in a short sentence.`;
