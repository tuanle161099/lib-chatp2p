import { randomBytes, box } from "tweetnacl";
import {
  encodeBase64,
  decodeUTF8,
  decodeBase64,
  encodeUTF8,
} from "tweetnacl-util";
import CryptoJS from "crypto-js";

import { MessageEncrypt } from "../schema";

export const encryptingMessage = (
  plain_text: string,
  shared_key: Uint8Array
) => {
  const nonce = randomBytes(24);
  //util.encodeBase64 before send message to Gun server
  const cipher_text = encodeBase64(
    box.after(decodeUTF8(plain_text), nonce, shared_key)
  );

  //message to be transited.
  const message_in_transit: MessageEncrypt = {
    cipher_text,
    nonce: encodeBase64(nonce),
  };

  return message_in_transit;
};

export const decryptingMessage = (message: any, shared_key: Uint8Array) => {
  //decodeBase64 after get data from Gun server
  const decoded_message = box.open.after(
    decodeBase64(message.cipher_text),
    decodeBase64(message.nonce),
    shared_key
  );
  if (!decoded_message) return;

  const plain_text = encodeUTF8(decoded_message);

  return plain_text;
};

/** Encrypt Keys */

export const encryptKey = (password: string, key: string) => {
  const encJson = CryptoJS.AES.encrypt(
    JSON.stringify(key),
    password
  ).toString();
  const encryptKey = CryptoJS.enc.Base64.stringify(
    CryptoJS.enc.Utf8.parse(encJson)
  );
  return encryptKey;
};

export const decryptKey = (password: string, encryptKey: string) => {
  try {
    const decKey = CryptoJS.enc.Base64.parse(encryptKey).toString(
      CryptoJS.enc.Utf8
    );
    const bytes = CryptoJS.AES.decrypt(decKey, password).toString(
      CryptoJS.enc.Utf8
    );
    return JSON.parse(bytes);
  } catch (error) {
    console.log(error);
  }
};
