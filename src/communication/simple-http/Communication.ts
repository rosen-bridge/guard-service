import axios, { AxiosInstance } from 'axios';
import CommunicationConfig from './CommunicationConfig';
import * as wasm from 'ergo-lib-wasm-nodejs';

type MessageBody = {
  id: number;
  message: string;
  sender: string;
};

export class Communication {
  lastId: number;
  address: string;
  secret: wasm.SecretKey;
  api: AxiosInstance;

  constructor(address: string, secret: wasm.SecretKey) {
    this.lastId = 0;
    this.address = address;
    this.secret = secret;
    this.api = axios.create({ baseURL: CommunicationConfig.server });
  }

  fetchMessage = (): Promise<Array<MessageBody>> => {
    const url = `get?user=${this.address}&id=${this.lastId}`;
    return this.api
      .get<Array<MessageBody>>(url)
      .then((res) => {
        if (res.data.length) {
          this.lastId = Math.max(...res.data.map((item) => item.id));
        }
        // TODO decrypt data messages
        return res.data;
      })
      .catch((exp) => {
        console.log(`an error during catch message ${exp}`);
        return [];
      });
  };

  putMessage = (message: string, receivers: Array<string>) => {
    // TODO sign message here
    return this.api
      .post(`put`, {
        sender: this.address,
        message: message,
        receiver: receivers,
      })
      .catch((exp) => {
        console.log(`an error during send message ${exp}`);
      });
  };
}
