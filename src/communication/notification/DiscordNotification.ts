import { WebhookClient } from 'discord.js';
import Configs from '../../helpers/Configs';
import { logger } from '../../log/Logger';

class DiscordNotification {
  static hookClient = new WebhookClient({
    url: Configs.discordWebHookUrl,
  });

  /**
   * sends a message to discord using webhook
   * @param msg
   */
  static sendMessage = async (msg: string): Promise<void> => {
    await this.hookClient
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
      });
  };
}

export default DiscordNotification;
