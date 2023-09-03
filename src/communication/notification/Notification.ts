import { WebhookClient } from 'discord.js';
import Configs from '../../configs/Configs';
import { loggerFactory } from '../../log/Logger';

const logger = loggerFactory(import.meta.url);

class Notification {
  private static instance: Notification;
  protected hookClient: WebhookClient;

  protected constructor() {
    try {
      if (Configs.discordWebHookUrl) {
        this.hookClient = new WebhookClient({
          url: Configs.discordWebHookUrl,
        });
        logger.debug(
          `'discordWebHookUrl' config is set, instantiating WebhookClient...`
        );
      } else logger.info("Key discordWebHookUrl isn't set in config");
    } catch (e) {
      logger.error(`Something was wrong, couldn't create WebhookClient: ${e}`);
    }
  }

  static getInstance = () => {
    if (!this.instance) {
      logger.debug("Notification instance didn't exist, creating a new one.");
      Notification.instance = new Notification();
      logger.info('Notification instance created.');
    }
    return Notification.instance;
  };

  /**
   * sends a message to notification service using webhook
   * @param msg
   */
  sendMessage = async (msg: string): Promise<void> => {
    if (this.hookClient) {
      this.hookClient
        .send({
          content: msg,
        })
        .then(() => {
          logger.info(`Notification has been sent using discord webhook`);
        })
        .catch((e) => {
          logger.warn(
            `An error occurred while sending message to discord webhook: ${e}`
          );
          logger.warn(e.stack);
        });
    } else {
      logger.info(`WebhookClient instance doesn't exist`);
      logger.debug(
        `Method sendMessage called for send notification with msg ${msg}`
      );
    }
  };
}

export default Notification;
