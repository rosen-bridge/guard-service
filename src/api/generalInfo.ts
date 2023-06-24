import { loggerFactory } from '../log/Logger';
import { FastifySeverInstance } from '../types/api';
import { infoResponseSchema, messageResponseSchema } from '../types/schema';
import ErgoConfigs from '../chains/ergo/helpers/ErgoConfigs';
import ChainHandler from '../handlers/ChainHandler';
import Utils from '../helpers/Utils';
import ChainsConstants from '../chains/ChainsConstants';

const logger = loggerFactory(import.meta.url);

/**
 * Gets the general info of the service
 * @param server
 */
const infoRoute = (server: FastifySeverInstance) => {
  server.get(
    '/info',
    {
      schema: {
        response: {
          200: infoResponseSchema,
          500: messageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const chainHandler = ChainHandler.getInstance();
        const ergoChain = chainHandler.getChain('ergo');
        const cardanoChain = chainHandler.getChain('cardano');

        const ergoLockAddress = ErgoConfigs.ergoContractConfig.lockAddress;
        const ergoLockBalance = await ergoChain.getLockAddressAssets();
        const ergoColdAddress = ErgoConfigs.coldAddress;
        const ergoColdBalance = await ergoChain.getColdAddressAssets();
        const cardanoLockBalance = await cardanoChain.getLockAddressAssets();

        reply.status(200).send({
          health: 'OK', //TODO: https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/245
          hot: {
            address: ergoLockAddress,
            balance: ergoLockBalance.nativeToken.toString(),
          },
          cold: {
            address: ergoColdAddress,
            balance: ergoColdBalance.nativeToken.toString(),
          },
          tokens: {
            ergo: Utils.extractTopTokens(ergoLockBalance.tokens, 5),
            cardano: Utils.extractTopTokens(cardanoLockBalance.tokens, 5),
          },
        });
      } catch (error) {
        logger.error(`An error occurred while fetching general info: ${error}`);
        logger.error(error.stack);
        reply.status(500).send({ message: error.message });
      }
    }
  );
};

const generalInfoRoute = async (server: FastifySeverInstance) => {
  infoRoute(server);
};

export { generalInfoRoute };
