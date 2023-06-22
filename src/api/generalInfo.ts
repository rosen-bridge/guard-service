import { loggerFactory } from '../log/Logger';
import { FastifySeverInstance } from '../types/api';
import { infoResponseSchema, messageResponseSchema } from '../types/schema';
import ErgoConfigs from '../chains/ergo/helpers/ErgoConfigs';
import ErgoTrack from '../chains/ergo/ErgoTrack';
import { NetworkPrefix } from 'ergo-lib-wasm-nodejs';
import ChainHandler from '../handlers/ChainHandler';
import CardanoConfigs from '../chains/cardano/helpers/CardanoConfigs';
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
        const ergoNetwork = chainHandler.getErgoNetwork();
        const cardanoNetwork = chainHandler.getCardanoNetwork();

        // Ergo hot wallet operations
        const ergoLockAddress = ErgoTrack.lockAddress.to_base58(
          NetworkPrefix.Mainnet
        );
        const ergoLockBalance = await ergoNetwork.getAddressAssets(
          ergoLockAddress
        );

        // Ergo cold wallet operations
        const ergoColdAddress = ErgoConfigs.coldAddress;
        const ergoColdBalance = await ergoNetwork.getAddressAssets(
          ergoColdAddress
        );

        // Cardano hot wallet operations
        const cardanoLockAddress = CardanoConfigs.lockAddress;
        const cardanoLockBalance = await cardanoNetwork.getAddressAssets(
          cardanoLockAddress
        );

        reply.status(200).send({
          health: 'OK', //TODO: https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/245
          hotWalletAddress: ergoLockAddress,
          hotWalletBalance: ergoLockBalance.nativeToken.toString(),
          coldWalletAddress: ergoColdAddress,
          coldWalletBalance: ergoColdBalance.nativeToken.toString(),
          ergoTokens: Utils.extractTopTokens(
            ergoLockBalance.tokens,
            ChainsConstants.tokenCountToDisplay
          ),
          cardanoTokens: Utils.extractTopTokens(
            cardanoLockBalance.tokens,
            ChainsConstants.tokenCountToDisplay
          ),
        });
      } catch (error) {
        logger.error(
          `An error occurred while processing TSS Cardano tx sign callback: ${error}`
        );
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
