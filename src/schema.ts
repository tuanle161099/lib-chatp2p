export type Message = {
  text: string;
  createdAt: string;
  owner: string;
};

export type MessageEncrypt = {
  cipher_text: string;
  nonce: string;
};

export type RequestChat = {
  owner: string;
  publicKey: string;
  messages: Message[];
  commonTopic: string;
};
