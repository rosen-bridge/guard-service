import fs from 'fs';
import config from 'config';
import { RosenTokens, TokenMap } from '@rosen-bridge/tokens';
import { ThresholdConfig } from '../coldStorage/types';
import { JsonBI } from '../network/NetworkModels';
import Utils from '../utils/Utils';
import { ConfigError } from '../utils/errors';
import { SUPPORTED_CHAINS } from '../utils/constants';
import { TransportOptions } from '@rosen-bridge/winston-logger';
import { cloneDeep } from 'lodash-es';

/**
 * reads a numerical config, set default value if it does not exits
 * @param key
 * @param defaultValue
 */
const getConfigIntKeyOrDefault = (key: string, defaultValue: number) => {
  const val: string = config.get(key);
  if (val !== undefined) {
    const valNum = parseInt(val);
    if (isNaN(valNum)) {
      throw Error(`Invalid value ${val} for ${key}`);
    }
    return valNum;
  }
  return defaultValue;
};

/**
 * reads chain network config, throws error if it is not supported
 * @param key
 * @param supportedNetworks
 */
const getChainNetworkName = (key: string, supportedNetworks: string[]) => {
  const network: string = config.get(key);
  if (network && supportedNetworks.includes(network)) return network;
  throw Error(`chain network [${network}] is not supported.`);
};

/**
 * reads an optional config, returns default value if it does not exits
 * @param key
 * @param defaultValue
 */
const getOptionalConfig = <T>(key: string, defaultValue: T) => {
  if (config.has(key)) {
    return config.get<T>(key);
  }
  return defaultValue;
};

const SupportedAlgorithms = ['eddsa'];
class KeygenConfig {
  static isActive = config.get<boolean>('keygen.active');
  static guardsCount = getConfigIntKeyOrDefault('keygen.guards', 0);
  static threshold = getConfigIntKeyOrDefault('keygen.threshold', 0);
  static algorithm = () => {
    const algorithm = config.get<string>('keygen.algorithm');
    if (SupportedAlgorithms.indexOf(algorithm) !== -1) {
      return algorithm;
    }
    throw Error(`Invalid keygen algorithm ${algorithm}`);
  };
}

class Configs {
  // express config
  static apiPort = getConfigIntKeyOrDefault('api.port', 8080);
  static apiHost = getOptionalConfig<string>('api.host', 'localhost');
  static apiKeyHash = config.get<string>('api.apiKeyHash');
  static apiBodyLimit =
    getConfigIntKeyOrDefault('api.jsonBodyLimit', 50) * 1024 * 1024; // value in MB
  static isManualTxRequestActive = getOptionalConfig<boolean>(
    'api.isManualTxRequestActive',
    false
  );

  // config of API's route
  static MAX_LENGTH_CHANNEL_SIZE = 200;

  // tss configs
  static tssExecutionPath = config.get<string>('tss.path');
  static tssConfigPath = config.get<string>('tss.configPath');
  static tssUrl = config.get<string>('tss.url');
  static tssPort = config.get<string>('tss.port');
  static tssTimeout = getConfigIntKeyOrDefault('tss.timeout', 8); // seconds
  static tssCallBackUrl = `http://${this.apiHost}:${this.apiPort}/tss/sign`;
  static tssKeygenCallBackUrl = `http://${this.apiHost}:${this.apiPort}/tss/keygen`;
  static tssKeys = {
    secret: config.get<string>('tss.secret'),
    ecdsa: {
      publicKeys: config.get<string[]>('tss.ecdsa.publicKeys'),
      chainCode: config.get<string>('tss.ecdsa.chainCode'),
      derivationPath: config.get<number[]>('tss.ecdsa.derivationPath'),
    },
    eddsa: {
      publicKeys: config.get<string[]>('tss.eddsa.publicKeys'),
      chainCode: config.get<string>('tss.eddsa.chainCode'),
    },
    ks: config.get<string[]>('tss.ks'),
  };

  // guards configs
  static guardMnemonic = config.get<string>('guard.mnemonic');
  static guardSecret = Utils.convertMnemonicToSecretKey(this.guardMnemonic);
  static guardConfigUpdateInterval = getConfigIntKeyOrDefault(
    'guard.configUpdateInterval',
    180
  );

  // contract, addresses and tokens config
  static networksType = SUPPORTED_CHAINS.map((network) =>
    config.get<string>(`${network}.networkType`).toLowerCase()
  );
  static addressesBasePath = config.get<string>('contracts.addressesBasePath');
  static tokens = (): RosenTokens => {
    const tokensPath = config.get<string>('tokensPath');
    if (!fs.existsSync(tokensPath)) {
      throw new Error(
        `Tokens config file with path ${tokensPath} doesn't exist`
      );
    } else {
      const configJson: string = fs.readFileSync(tokensPath, 'utf8');
      return JSON.parse(configJson);
    }
  };
  static thresholds = (): ThresholdConfig => {
    const thresholdsPath = config.get<string>('thresholdsPath');
    if (!fs.existsSync(thresholdsPath)) {
      throw new Error(
        `Asset thresholds config file with path ${thresholdsPath} doesn't exist`
      );
    } else {
      const configJson: string = fs.readFileSync(thresholdsPath, 'utf8');
      return JsonBI.parse(configJson);
    }
  };
  static tokenMap = new TokenMap(this.tokens());

  // timeout configs
  static eventTimeout = getConfigIntKeyOrDefault('eventTimeout', 24 * 60 * 60); // seconds
  static txSignTimeout = getConfigIntKeyOrDefault('txSignTimeout', 5 * 60); // seconds

  // jobs configs
  static scannedEventProcessorInterval = 120; // seconds, 2 minutes
  static txProcessorInterval = getConfigIntKeyOrDefault(
    'intervals.txProcessorInterval',
    180
  ); // seconds
  static agreementQueueInterval = 5; // seconds
  static txResendInterval = 25; // seconds
  static approvalResendDelay = 5; // seconds
  static multiSigCleanUpInterval = 120; // seconds
  static tssInstanceRestartGap = 5; // seconds
  static tssUpdateInterval = 10; // seconds
  static timeoutProcessorInterval = getConfigIntKeyOrDefault(
    'intervals.timeoutProcessorInterval',
    3600
  ); // seconds
  static requeueWaitingEventsInterval = getConfigIntKeyOrDefault(
    'intervals.requeueWaitingEventsInterval',
    43200
  ); // seconds

  static multiSigFirstSignDelay = 3; // seconds

  // logs configs
  static logs;
  static {
    const logs = config.get<TransportOptions[]>('logs');
    const clonedLogs = cloneDeep(logs);
    const wrongLogTypeIndex = clonedLogs.findIndex((log) => {
      const logTypeValidation = ['console', 'file', 'loki'].includes(log.type);
      let loggerChecks = true;
      if (log.type === 'loki') {
        const overrideLokiBasicAuth = getOptionalConfig(
          'overrideLokiBasicAuth',
          ''
        );
        if (overrideLokiBasicAuth !== '') log.basicAuth = overrideLokiBasicAuth;
        loggerChecks =
          log.host != undefined &&
          typeof log.host === 'string' &&
          log.level != undefined &&
          typeof log.level === 'string' &&
          (log.serviceName ? typeof log.serviceName === 'string' : true) &&
          (log.basicAuth ? typeof log.basicAuth === 'string' : true);
      } else if (log.type === 'file') {
        loggerChecks =
          log.path != undefined &&
          typeof log.path === 'string' &&
          log.level != undefined &&
          typeof log.level === 'string' &&
          log.maxSize != undefined &&
          typeof log.maxSize === 'string' &&
          log.maxFiles != undefined &&
          typeof log.maxFiles === 'string';
      }
      return !(loggerChecks && logTypeValidation);
    });
    if (wrongLogTypeIndex >= 0) {
      throw new ConfigError(
        `logs[${wrongLogTypeIndex}]`,
        logs[wrongLogTypeIndex]
      );
    }
    this.logs = clonedLogs;
  }

  static discordWebHookUrl = config.get<string>('discordWebHookUrl');

  // Database Configs
  static dbType = getOptionalConfig('database.type', '');
  static dbPath = getOptionalConfig('database.path', '');
  static dbHost = getOptionalConfig('database.host', '');
  static dbPort = getOptionalConfig('database.port', 5432);
  static dbUser = getOptionalConfig('database.user', '');
  static dbPassword = getOptionalConfig('database.password', '');
  static dbName = getOptionalConfig('database.name', '');

  // HealthCheck Configs
  static healthUpdateInterval = getConfigIntKeyOrDefault(
    'healthCheck.interval',
    60
  );
  static ergWarnThreshold = BigInt(
    config.get<string>('healthCheck.asset.erg.warnThreshold')
  );
  static ergCriticalThreshold = BigInt(
    config.get<string>('healthCheck.asset.erg.criticalThreshold')
  );
  static rsnWarnThreshold = BigInt(
    config.get<string>('healthCheck.asset.rsn.warnThreshold')
  );
  static rsnCriticalThreshold = BigInt(
    config.get<string>('healthCheck.asset.rsn.criticalThreshold')
  );
  static adaWarnThreshold = BigInt(
    config.get<string>('healthCheck.asset.ada.warnThreshold')
  );
  static adaCriticalThreshold = BigInt(
    config.get<string>('healthCheck.asset.ada.criticalThreshold')
  );
  static ergoScannerWarnDiff = getConfigIntKeyOrDefault(
    'healthCheck.ergoScanner.warnDifference',
    2
  );
  static ergoScannerCriticalDiff = getConfigIntKeyOrDefault(
    'healthCheck.ergoScanner.criticalDifference',
    100
  );
  static ergoNodeMaxHeightDiff = getConfigIntKeyOrDefault(
    'healthCheck.ergoNode.maxHeightDifference',
    2
  );
  static ergoNodeMaxBlockTime =
    getConfigIntKeyOrDefault('healthCheck.ergoNode.maxBlockTime', 1800) / 60;
  static ergoNodeMinPeerCount = getConfigIntKeyOrDefault(
    'healthCheck.ergoNode.minPeerCount',
    10
  );
  static ergoNodeMaxPeerHeightDifference = getConfigIntKeyOrDefault(
    'healthCheck.ergoNode.maxPeerHeightDifference',
    2
  );
  static errorLogAllowedCount = getConfigIntKeyOrDefault(
    'healthCheck.errorLog.maxAllowedCount',
    1
  );
  static errorLogDuration = getConfigIntKeyOrDefault(
    'healthCheck.errorLog.duration',
    10
  );
  static p2pDefectConfirmationTimeWindow = getConfigIntKeyOrDefault(
    'healthCheck.p2p.defectConfirmationTimeWindow',
    120
  );
  static p2pBrokenTimeAllowed =
    getConfigIntKeyOrDefault('p2p.brokenTimeAllowed', 1200) * 1000;

  // Revenue Config
  static revenueUpdateInterval = getConfigIntKeyOrDefault(
    'revenue.interval',
    120
  );
  static keygen = KeygenConfig;
}

export default Configs;
export { getConfigIntKeyOrDefault, getChainNetworkName };
