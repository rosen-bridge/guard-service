import fs from 'fs';

import config from 'config';
import { RosenTokens, TokenMap } from '@rosen-bridge/tokens';

import { ThresholdConfig } from '../guard/coldStorage/types';
import { JsonBI } from '../network/NetworkModels';

import { ConfigError } from './errors';

import { LogConfig } from '../types';

/**
 * reads a numerical config, set default value if it does not exits
 * @param key
 * @param defaultValue
 */
const getConfigIntKeyOrDefault = (key: string, defaultValue: number) => {
  const val: string = config.get(key);
  if (val) {
    const valNum = parseInt(val);
    if (isNaN(valNum)) {
      return defaultValue;
    }
    return valNum;
  }
  return defaultValue;
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

class Configs {
  // express config
  static expressPort = getConfigIntKeyOrDefault('express.port', 8080);
  private static expressBodyLimitValue = getConfigIntKeyOrDefault(
    'express.jsonBodyLimit',
    50
  );
  static expressBodyLimit = `${this.expressBodyLimitValue}mb`;

  // config of API's route
  static MAX_LENGTH_CHANNEL_SIZE = 200;

  // tss configs
  static tssExecutionPath = config.get<string>('tss.path');
  static tssConfigPath = config.get<string>('tss.configPath');
  static tssUrl = config.get<string>('tss.url');
  static tssPort = config.get<string>('tss.port');
  static tssTimeout = getConfigIntKeyOrDefault('tss.timeout', 8); // seconds
  static tssCallBackUrl = `http://localhost:${this.expressPort}/tss/sign`;

  // guards configs
  static guardSecret = config.get<string>('guard.secret');
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
  static txResendInterval = 30; // seconds
  static multiSigCleanUpInterval = 120; // seconds
  static tssInstanceRestartGap = 5; // seconds
  static timeoutProcessorInterval = getConfigIntKeyOrDefault(
    'intervals.timeoutProcessorInterval',
    3600
  ); // seconds
  static requeueWaitingEventsInterval = getConfigIntKeyOrDefault(
    'intervals.requeueWaitingEventsInterval',
    43200
  ); // seconds

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
}

export default Configs;
export { getConfigIntKeyOrDefault };
