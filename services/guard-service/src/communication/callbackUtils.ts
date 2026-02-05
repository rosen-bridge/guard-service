import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import { SubscribeChannelWithURL } from '@rosen-bridge/dialer';
import RateLimitedAxios from '@rosen-clients/rate-limited-axios';

import RoseNetNodeConfig from '../configs/roseNetNodeConfig';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

const apiCallBack: SubscribeChannelWithURL['func'] = (
  msg,
  channel,
  sender,
  url,
) => {
  const data = RateLimitedAxios.post(
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
    },
  );
  data.catch((error) => {
    if (RateLimitedAxios.isAxiosError(error)) {
      logger.warn(`An error occurred while calling api url ${url}: ${error}`);
      if (error.stack) logger.warn(error.stack);
      if (error.response) {
        logger.debug(
          `The request was made and the server responded with a non-2xx code.`,
          {
            code: error.code,
            data: error.response.data,
          },
        );
      } else if (error.request) {
        logger.debug(
          `The request was made but no response was received. Make sure TSS is up and accessible.`,
          {
            code: error.code,
          },
        );
      } else {
        logger.debug(
          `Something happened in setting up the request that triggered the error.`,
        );
      }
    }
  });
};

export { apiCallBack };
