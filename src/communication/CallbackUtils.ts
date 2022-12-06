import axios from 'axios';
import CommunicationConfig from './CommunicationConfig';
import { SubscribeChannelWithURL } from './Interfaces';
import { logger } from '../log/Logger';

const apiCallBack: SubscribeChannelWithURL['func'] = (
  msg,
  channel,
  sender,
  url
) => {
  const data = axios.post(
    url,
    {
      message: msg,
      channel: channel,
      sender: sender,
    },
    {
      timeout: CommunicationConfig.apiCallbackTimeout * 1000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );
  data.catch((error) => {
    if (axios.isAxiosError(error)) {
      logger.warn(`An error occurred, ${error.message}`);
    } else {
      logger.error(`Unexpected error, ${error}`);
    }
  });
};

export { apiCallBack };
