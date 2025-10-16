import {
  AbstractNotification,
  NotificationSeverity,
  NotifyWithSeverity,
} from '@rosen-bridge/abstract-notification';
import { DiscordNotification } from '@rosen-bridge/discord-notification';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import Configs from '../configs/configs';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

export class NotificationHandler {
  private static instance: NotificationHandler;
  protected notification: AbstractNotification | undefined;

  protected constructor() {
    try {
      if (Configs.discordWebHookUrl) {
        logger.debug(
          `'discordWebHookUrl' config is set, instantiating DiscordNotification...`,
        );
        this.notification = new DiscordNotification(Configs.discordWebHookUrl);
      } else logger.info("Key 'discordWebHookUrl' isn't set in config");
    } catch (e) {
      logger.error(
        `Something was wrong, couldn't create DiscordNotification: ${e}`,
      );
    }
  }

  /**
   * initiates NotificationHandler
   */
  public static setup = (): NotificationHandler => {
    // TODO: support various endpoints instead of instantiating only with discord
    //  local:ergo/rosen-bridge/guard-service#391
    NotificationHandler.instance = new NotificationHandler();
    logger.debug('NotificationHandler instantiated');
    return NotificationHandler.instance;
  };

  /**
   * throws an Error if NotificationHandler object doesn't exist
   * @returns NotificationHandler instance
   */
  public static getInstance = (): NotificationHandler => {
    if (!NotificationHandler.instance)
      throw Error(`NotificationHandler instance doesn't exist`);
    return NotificationHandler.instance;
  };

  /**
   * sends notification
   * @param severity
   * @param title
   * @param message
   */
  notify: NotifyWithSeverity = async (
    severity: NotificationSeverity,
    title: string,
    message: string,
  ) => {
    try {
      if (this.notification) {
        await this.notification.notify(severity, title, message);
      } else {
        logger.warn(
          `No endpoint is set in NotificationHandler. Failed to notify about [${title}] with severity [${severity}]: ${message}`,
        );
      }
    } catch (e) {
      logger.warn(
        `An error occurred while sending notification about [${title}] with severity [${severity}]: ${e}`,
      );
      logger.debug(
        `Failed to notify about [${title}] with severity [${severity}]: ${message}`,
      );
    }
  };
}
