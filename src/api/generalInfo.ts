import { loggerFactory } from '../log/Logger';
import { FastifySeverInstance } from '../types/api';
import { infoResponseSchema, messageResponseSchema } from '../types/schema';
import ErgoConfigs from '../chains/ergo/helpers/ErgoConfigs';
import ErgoTrack from '../chains/ergo/ErgoTrack';
import { NetworkPrefix } from 'ergo-lib-wasm-nodejs';
import ChainHandler from '../handlers/ChainHandler';
import Utils from '../helpers/Utils';
import ChainsConstants from '../chains/ChainsConstants';

const logger = loggerFactory(import.meta.url);

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

        const ergoLockAddress = ErgoTrack.lockAddress.to_base58(
          NetworkPrefix.Mainnet
        );
        const ergoLockBalance = await ergoChain.getLockAddressAssets();
        const ergoColdAddress = ErgoConfigs.coldAddress;
        const cardanoLockBalance = await cardanoChain.getLockAddressAssets();

        reply.status(200).send({
          health: 'OK', //TODO: https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/245
          hot: {
            address: ergoLockAddress,
            balance: ergoLockBalance.nativeToken.toString(),
          },
          cold: {
            address: ergoColdAddress,
            balance: '0', // TODO: After release of rosen-chains
          },
          tokens: {
            ergo: Utils.extractTopTokens(
              ergoLockBalance.tokens,
              ChainsConstants.tokenCountToDisplay
            ),
            cardano: Utils.extractTopTokens(
              cardanoLockBalance.tokens,
              ChainsConstants.tokenCountToDisplay
            ),
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
