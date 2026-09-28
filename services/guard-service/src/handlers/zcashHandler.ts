import { NativeZcashInspector } from '@rosen-bridge/rosen-extractor';
import { TokenMap } from '@rosen-bridge/tokens';
import { SigningStatus, TransactionType } from '@rosen-chains/abstract-chain';
import { ZcashChain } from '@rosen-chains/zcash';
import {
  NativePaymentClient,
  ZcashPaymentEvidence,
  ZcashRpcEvidenceSource,
  ZcashTransaction,
} from '@rosen-chains/zcash-payment';

import Configs from '../configs/configs';
import type { ZcashGuardConfig } from '../configs/guardsZcashConfigs';
import GuardsZcashConfigs from '../configs/guardsZcashConfigs';
import type { ZcashBroadcastCapability } from '../transaction/zcashBroadcastCoordinator';
import { ZcashNativeSigningCapability } from '../transaction/zcashNativeSigningCapability';
import type { ZcashApprovedSigningCapability } from '../transaction/zcashSigningCoordinator';
import TssHandler from './tssHandler';

export interface ZcashGuardRuntime {
  readonly chain: ZcashChain;
  getSigningCapability(): ZcashApprovedSigningCapability;
  getBroadcastCapability(): ZcashBroadcastCapability;
}

const configuredRuntimes = new WeakMap<TokenMap, ZcashGuardRuntime>();

/** Shares the configured runtime between startup, chain dispatch and monitoring. */
export const getConfiguredZcashGuardRuntime = (
  tokens: TokenMap,
): ZcashGuardRuntime | undefined => {
  const config = GuardsZcashConfigs.read();
  if (!config) return undefined;
  let runtime = configuredRuntimes.get(tokens);
  if (!runtime) {
    runtime = createZcashGuardRuntime(config, tokens);
    configuredRuntimes.set(tokens, runtime);
  }
  return runtime;
};

/** Checks the enabled node before the service starts peers, signing or jobs. */
export const initializeZcashGuardRuntime = async (tokens: TokenMap) => {
  const runtime = getConfiguredZcashGuardRuntime(tokens);
  if (runtime) await runtime.chain.getHeight();
  return runtime;
};

/** Builds one chain and signing capability from the same operator configuration. */
export function createZcashGuardRuntime(
  config: ZcashGuardConfig,
  tokens: TokenMap,
): ZcashGuardRuntime {
  const native = new NativePaymentClient(config.native);
  const inspector = new NativeZcashInspector(config.inspector);
  const source = new ZcashRpcEvidenceSource(config.rpc);
  const chain = new ZcashChain({
    source,
    policy: config.sourcePolicy,
    native,
    inspector,
    configs: config.chain,
    reserveCompressedPubkeyHex: config.signing.publicKey,
    tokens,
    ...config.payment,
  });
  const evidence = new ZcashPaymentEvidence(
    source,
    inspector,
    config.sourcePolicy,
  );
  let capability: ZcashNativeSigningCapability | undefined;
  const broadcast = Object.freeze<ZcashBroadcastCapability>({
    policy: () =>
      Object.freeze({
        network: config.sourcePolicy.network,
        genesisHash: config.sourcePolicy.genesisHash,
        sourceId: config.sourcePolicy.sourceId,
        requiredConfirmations: chain.getTxRequiredConfirmation(
          TransactionType.payment,
        ),
        maximumAgeMs: 60_000,
      }),
    validate: (binding, signedJson) => {
      const approved = ZcashTransaction.inspectProposalJson(
        binding.approvedTxJson,
        native,
        inspector,
      );
      const signed = ZcashTransaction.fromJson(
        signedJson,
        approved.getIntent(),
        native,
        inspector,
      );
      const intent = signed.getIntent();
      if (
        approved.getSignedHex() !== undefined ||
        signed.getSignedHex() === undefined ||
        signed.getUnsignedHex() !== approved.getUnsignedHex() ||
        signed.txId !== binding.txId ||
        intent.eventId !== binding.eventId ||
        binding.genesisHash !== config.sourcePolicy.genesisHash ||
        binding.outpoint !== `${intent.input.txid}:${intent.input.index}` ||
        binding.sighashAll !== signed.getDigest().sighash_all ||
        !chain.verifyTransactionExtraConditions(signed, SigningStatus.Signed)
      )
        throw Error('Zcash broadcast native binding mismatch');
      return signed.extractPaymentOrder();
    },
    observe: async (signedJson) =>
      chain.observeTransaction(chain.PaymentTransactionFromJson(signedJson)),
    submit: async (signedJson, beforeSubmit) =>
      chain.submitTransaction(
        chain.PaymentTransactionFromJson(signedJson),
        beforeSubmit,
      ),
  });
  return Object.freeze({
    chain,
    getBroadcastCapability: () => broadcast,
    getSigningCapability: (): ZcashApprovedSigningCapability => {
      if (!capability) {
        const signer = TssHandler.getInstance().wrapBoundCurveSigner(
          config.signing.chainCode,
          config.signing.derivationPath,
        );
        capability = new ZcashNativeSigningCapability(
          native,
          inspector,
          evidence,
          signer,
          () => ({
            ...config.signing,
            network: config.sourcePolicy.network,
            genesisHash: config.sourcePolicy.genesisHash,
            sourceId: config.sourcePolicy.sourceId,
            reserveAddress: config.chain.addresses.lock,
            ...config.payment,
            guardPublicKeys: Configs.tssKeys.pubs.map((pub) => pub.curvePub),
            shareIds: Configs.tssKeys.pubs.map((pub) => pub.curveShareId),
          }),
        );
      }
      return capability;
    },
  });
}
