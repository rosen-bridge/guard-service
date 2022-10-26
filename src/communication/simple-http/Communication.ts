import axios from 'axios';
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

  constructor(address: string, secret: wasm.SecretKey) {
    this.lastId = 0;
    this.address = address;
    this.secret = secret;
  }

  fetchMessage = (): Promise<Array<MessageBody>> => {
    const url = `${CommunicationConfig.server}get?user=${this.address}&id=${this.lastId}`;
    return axios.get<Array<MessageBody>>(url).then((res) => {
      if (res.data.length) {
        this.lastId = Math.max(...res.data.map((item) => item.id));
      }
      // TODO decrypt data messages
      return res.data;
    });
  };

  putMessage = (message: string, receivers: Array<string>) => {
    // TODO sign message here
    return axios.post(`${CommunicationConfig.server}put`, {
      sender: this.address,
      message: message,
      receiver: receivers,
    });
  };
}
