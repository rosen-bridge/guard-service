import axios from 'axios';
import CommunicationConfig from './CommunicationConfig';
import { SubscribeChannelWithURL } from './Interfaces';
import { loggerFactory } from '../log/Logger';

const logger = loggerFactory(import.meta.url);

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
      if (error.response) {
        logger.warn(
          `An error occurred while calling api url ${url}. The request was made and the server responded with a non-2xx code: ${error}\n${error.stack}`,
          {
            code: error.code,
            data: error.response.data,
            request: error.request,
          }
        );
      } else if (error.request) {
        logger.warn(
          `An error occurred while calling api url ${url}. The request was made but no response was received. Make sure TSS is up and accessible: ${error}\n${error.stack}`,
          {
            code: error.code,
            request: error.request,
          }
        );
      } else {
        logger.warn(
          `An error occurred while calling api url ${url}. Something happened in setting up the request that triggered the error: ${error}\n${error.stack}`
        );
      }
    }
  });
};

export { apiCallBack };
