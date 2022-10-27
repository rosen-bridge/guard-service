import { Request, Response, Router } from 'express';
import { apiCallBack } from '../communication/CallbackUtils';
import { body, validationResult } from 'express-validator';
import Configs from '../helpers/Configs';
import Dialer from '../communication/simple-http/Dialer';

/**
 * Api for send a message over p2p protocol
 * @bodyParam {string}
 * @bodyParam {object}
 * @bodyParam {string}
 */
const setupRouter = async () => {
  const p2pRouter = Router();
  const connector = await Dialer.getInstance();
  p2pRouter.post(
    '/send',
    body('channel')
      .notEmpty()
      .withMessage('key channel is required!')
      .isString()
      .isLength({ max: Configs.MAX_LENGTH_CHANNEL_SIZE }),
    body('message')
      .notEmpty()
      .withMessage('key message is required!')
      .isString(),
    body('receiver').optional().isString(),
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        req.body.receiver
          ? connector.sendMessage(
              req.body.channel,
              req.body.message,
              req.body.receiver
            )
          : connector.sendMessage(req.body.channel, req.body.message);

        res.send({ message: 'ok' });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    }
  );

  /**
   * Api for send a message over p2p protocol
   */
  p2pRouter.post(
    '/channel/subscribe',
    body('channel')
      .notEmpty()
      .withMessage('key channel is required!')
      .isString()
      .isLength({ max: Configs.MAX_LENGTH_CHANNEL_SIZE }),
    body('url').notEmpty().withMessage('key url is required!').isString(),
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        connector.subscribe({ channel: req.body.channel, url: req.body.url });
        res.send({ message: 'ok' });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    }
  );
  return p2pRouter;
};

export default setupRouter;
