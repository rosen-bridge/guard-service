import fs from 'fs';
import config from 'config';
import { RosenTokens, TokenMap } from '@rosen-bridge/tokens';
import { ThresholdConfig } from '../coldStorage/types';
import { JsonBI } from '../network/NetworkModels';
import { LogConfig } from '../types';
import { isNumber } from 'lodash-es';
import Utils from '../utils/Utils';
import { ConfigError } from '../utils/errors';

/**
 * reads a numerical config, set default value if it does not exits
 * @param key
 * @param defaultValue
 */
const getConfigIntKeyOrDefault = (key: string, defaultValue: number) => {
  const val: string = config.get(key);
  if (isNumber(val)) {
    const valNum = parseInt(val);
    if (isNaN(valNum)) {
      return defaultValue;
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

class KeygenConfig {
  static isActive = config.get<string>('keygen.active') === 'true';
  static guardsCount = getConfigIntKeyOrDefault('keygen.guards', 0);
  static threshold = getConfigIntKeyOrDefault('keygen.threshold', 0);
}

class Configs {
  // express config
  static apiPort = getConfigIntKeyOrDefault('api.port', 8080);
  static apiHost = getOptionalConfig<string>('api.host', 'localhost');
  static apiBodyLimit =
    getConfigIntKeyOrDefault('api.jsonBodyLimit', 50) * 1024 * 1024; // value in MB

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
    publicKeys: config.get<string[]>('tss.publicKeys'),
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
  static networks = config.get<Array<string>>('networks');
  static networksType = Configs.networks.map((network) =>
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
  static eventTimeout = 86400; // seconds, 1 day
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
    const logs = config.get<LogConfig[]>('logs');
    const wrongLogTypeIndex = logs.findIndex(
      (log) => !['console', 'file'].includes(log.type)
    );
    if (wrongLogTypeIndex >= 0) {
      throw new ConfigError(
        `logs[${wrongLogTypeIndex}].type`,
        logs[wrongLogTypeIndex].type
      );
    }
    this.logs = logs;
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
  static keygen = KeygenConfig;
}

export default Configs;
export { getConfigIntKeyOrDefault, getChainNetworkName };
