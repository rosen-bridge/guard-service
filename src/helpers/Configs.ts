import config from 'config';
import { RosenTokens, TokenMap } from '@rosen-bridge/tokens';
import fs from 'fs';
import { ThresholdConfig } from '../guard/coldStorage/types';
import { JsonBI } from '../network/NetworkModels';

/**
 * reads a config, set default value if it does not exits
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

class Configs {
  // express config
  static expressPort = config.get<number>('express.port');
  private static expressBodyLimitValue = config.get<number>(
    'express.jsonBodyLimit'
  );
  static expressBodyLimit = `${this.expressBodyLimitValue}mb`;

  // config of API's route
  static MAX_LENGTH_CHANNEL_SIZE = 200;

  // tss configs
  static tssExecutionPath = config.get<string>('tss.path');
  static tssConfigPath = config.get<string>('tss.configPath');
  static tssUrl = config.get<string>('tss.url');
  static tssPort = config.get<string>('tss.port');
  static tssTimeout = config.get<number>('tss.timeout'); // seconds
  static tssCallBackUrl = `http://localhost:${this.expressPort}/tss/sign`;

  // guards configs
  static guardSecret = config.get<string>('guard.secret');
  static guardConfigUpdateInterval = config.get<number>(
    'guard.configUpdateInterval'
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
  static multiSigTimeout = getConfigIntKeyOrDefault('multiSigTimeout', 5 * 60); // seconds
  static eventTimeout = 86400; // seconds, 1 day
  static txSignTimeout = getConfigIntKeyOrDefault('txSignTimeout', 6 * 60); // seconds

  // jobs configs
  static scannedEventProcessorInterval = 120; // seconds, 2 minutes
  static txProcessorInterval = config.get<number>(
    'intervals.txProcessorInterval'
  ); // seconds
  static txResendInterval = 30; // seconds
  static multiSigCleanUpInterval = 120; // seconds
  static tssInstanceRestartGap = 5; // seconds
  static timeoutProcessorInterval = config.get<number>(
    'intervals.timeoutProcessorInterval'
  ); // seconds
  static requeueWaitingEventsInterval = config.get<number>(
    'intervals.requeueWaitingEventsInterval'
  ); // seconds

  //logs configs
  static logsPath = config.get<string>('logs.path');
  static maxLogSize = config.get<string>('logs.maxSize');
  static maxLogFiles = config.get<string>('logs.maxFiles');
  static logLevel = config.get<string>('logs.level');

  static discordWebHookUrl = config.get<string>('discordWebHookUrl');
}

export default Configs;
