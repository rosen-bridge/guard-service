import axios from 'axios';
import { SubscribeChannelWithURL } from '@rosen-bridge/dialer';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import RoseNetNodeConfig from '../configs/RoseNetNodeConfig';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

const apiCallBack: SubscribeChannelWithURL['func'] = (
  msg,
  channel,
  url,
  sender
) => {
  const data = axios.post(
    url,
    {
      message: msg,
      channel: channel,
      sender: sender,
    },
    {
      timeout: RoseNetNodeConfig.apiCallbackTimeout * 1000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );
  data.catch((error) => {
    if (axios.isAxiosError(error)) {
      logger.warn(`An error occurred while calling api url ${url}: ${error}`);
      if (error.stack) logger.warn(error.stack);
      if (error.response) {
        logger.debug(
          `The request was made and the server responded with a non-2xx code.`,
          {
            code: error.code,
            data: error.response.data,
          }
        );
      } else if (error.request) {
        logger.debug(
          `The request was made but no response was received. Make sure TSS is up and accessible.`,
          {
            code: error.code,
          }
        );
      } else {
        logger.debug(
          `Something happened in setting up the request that triggered the error.`
        );
      }
    }
  });
};

export { apiCallBack };
