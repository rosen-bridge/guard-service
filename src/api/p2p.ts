import { Request, Response, Router } from 'express';
import { apiCallBack } from '../communication/CallbackUtils';
import Dialer from '../communication/Dialer';
import { body, validationResult } from 'express-validator';
import Configs from '../helpers/Configs';
import { logger } from '../log/Logger';

const p2pRouter = Router();
const dialer = await Dialer.getInstance();

/**
 * Api for send a message over p2p protocol
 * @bodyParam {string}
 * @bodyParam {object}
 * @bodyParam {string}
 */
p2pRouter.post(
  '/send',
  body('channel')
    .notEmpty()
    .withMessage('key channel is required!')
    .isString()
    .isLength({ max: Configs.MAX_LENGTH_CHANNEL_SIZE }),
  body('message').notEmpty().withMessage('key message is required!').isString(),
  body('receiver').optional().isString(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      req.body.receiver
        ? dialer.sendMessage(
            req.body.channel,
            req.body.message,
            req.body.receiver
          )
        : dialer.sendMessage(req.body.channel, req.body.message);

      res.send({ message: 'ok' });
    } catch (error) {
      logger.error(
        `An error occurred while send message over p2p: ${error.message}`
      );
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
      dialer.subscribeChannel(req.body.channel, apiCallBack, req.body.url);
      res.send({ message: 'ok' });
    } catch (error) {
      logger.error(
        `An error occurred while subscribe channel: ${error.message}`
      );
      res.status(500).send({ message: error.message });
    }
  }
);

/**
 * Api for send peer IDs
 */
p2pRouter.get('/getPeerIDs', async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const peerIDs = dialer.getPeerIds();
    res.status(200).json(peerIDs);
  } catch (error) {
    logger.warn(`An error occurred while return peerIDs: ${error.message}`);
    res.status(500).send({ message: error.message });
  }
});

/**
 * Api for sending dialer id
 */
p2pRouter.get('/getPeerID', async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const dialerId = dialer.getDialerId();
    res.status(200).json({ message: dialerId, status: 'ok' });
  } catch (error) {
    logger.warn(`An error occurred while return peerID: ${error.message}`);
    res.status(500).send({ message: error.message });
  }
});

export { p2pRouter };
