import * as Gun from "gun";
import { BoxKeyPair, box } from "tweetnacl";
import { decodeBase64, encodeBase64 } from "tweetnacl-util";

import { Message, RequestChat } from "../schema";
import { decryptingMessage, encryptingMessage } from "./util";

class GunChat {
  private _provider: any;
  private _keypair: BoxKeyPair;
  private _gunServer: string;
  constructor(keypair: BoxKeyPair, gunServer: string) {
    this._provider = null;
    this._keypair = keypair;
    this._gunServer = gunServer;
  }

  getProvider = async () => {
    const db = Gun({ peers: [this._gunServer] });
    this._provider = db;
    return this._provider;
  };

  getShareKey = async (receiverPK: string) => {
    const mySecretKey = this._keypair.secretKey;
    const receiverDecode = decodeBase64(receiverPK);
    const secretKeyDecode = mySecretKey;
    return box.before(receiverDecode, secretKeyDecode);
  };

  loadMessage = async (topic: string) => {
    const provider = await this.getProvider();
    const messages = await provider.get(topic);
    const listMessage: Record<string, any> = {};
    await messages.map().once(async (data) => {
      const message = { data };

      if (listMessage[data.owner]) {
        const { chat } = listMessage[data.owner];
        const newMess = [...chat];
        newMess.push(data.chat);
        listMessage[data.owner] = { ...listMessage[data.owner], chat: newMess };
      }
      listMessage[data.owner] = message;
    });
    return listMessage;
  };

  sendEncryptMessage = async (
    message: string,
    receiverPK: string,
    owner: string,
    topic: string
  ) => {
    const sharedKey = await this.getShareKey(receiverPK);
    const provider = await this.getProvider();

    const messageEncrypted = encryptingMessage(message, sharedKey);
    const id = new Date().toISOString();
    const newMess = provider
      .get("messages")
      .set({ ...messageEncrypted, owner });

    provider.get(topic).get(id).put(newMess);
  };

  loadDecryptMessages = async (topic: string, receiverPK: string) => {
    const sharedKey = await this.getShareKey(receiverPK);
    const provider = await this.getProvider();
    const messages = await provider.get(topic);
    const listMessage: Record<string, Message> = {};

    await messages.map().once(async (data, id) => {
      const text = decryptingMessage(data, sharedKey);
      if (!text) return;
      const createdAt = id;
      const message: Message = {
        text,
        createdAt,
        owner: data.owner,
      };
      listMessage[createdAt] = message;
    });

    return listMessage;
  };

  sendRequestChat = async (
    commonTopic: string,
    message: string,
    receiver: string,
    owner: string
  ) => {
    const id = new Date().toISOString();
    const provider = await this.getProvider();
    const receiverTopic = receiver;
    const myPublicKey = encodeBase64(this._keypair.publicKey);

    const newMess = provider.get("messages").set({
      chat: message,
      publicKey: myPublicKey,
      owner,
      sendTo: receiver,
      commonTopic,
    });
    provider.get(receiverTopic).get(id).put(newMess);
  };

  acceptRequestChat = async (
    requestChat: RequestChat,
    owner: string,
    topic: string
  ) => {
    const provider = await this.getProvider();
    const {
      owner: receiverAddr,
      publicKey: receiverPK,
      commonTopic,
    } = requestChat;
    const myPublicKey = encodeBase64(this._keypair.publicKey);
    const receiverTopic = receiverAddr;
    const id = new Date().toISOString();

    const message = provider.get("messages").set({
      publicKey: myPublicKey,
      owner: owner,
      sendTo: receiverAddr,
    });
    await provider.get(topic).get(id).put(message);

    /**Send data to receiver topic for get history*/
    await provider.get(receiverTopic).get(id).put({
      publicKey: myPublicKey,
      owner,
      sendTo: receiverAddr,
      commonTopic,
      rely: true,
    });
    return { commonTopic, receiverAddr, receiverPK };
  };
}

export default GunChat;
