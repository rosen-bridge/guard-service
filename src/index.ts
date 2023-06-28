import 'reflect-metadata';
import { initDataSources } from './jobs/dataSources';
import { initializeMultiSigJobs } from './jobs/multiSig';
import { initApiServer } from './jobs/apiServer';
import { startTssInstance } from './jobs/tss';
import { runProcessors } from './jobs/runProcessors';
import MultiSigHandler from './guard/multisig/MultiSig';
import Configs from './helpers/Configs';
import { initScanner } from './jobs/initScanner';
import { guardConfigUpdate } from './jobs/guardConfigUpdate';
import { guardConfig } from './helpers/GuardConfig';
import { healthCheckStart } from './jobs/healthCheck';
import ChainHandler from './handlers/ChainHandler';
import TxAgreement from './agreement/TxAgreement';

const init = async () => {
  // init guards config
  await guardConfig.setConfig(false);

  // initialize all data sources
  await initDataSources();

  // initialize express Apis
  await initApiServer();

  // guard config update job
  guardConfigUpdate();

  // initialize tss multiSig object
  MultiSigHandler.getInstance(guardConfig.publicKeys, Configs.guardSecret);
  initializeMultiSigJobs();

  // initialize TxAgreement object
  await TxAgreement.getInstance();

  // initialize chain objects
  ChainHandler.getInstance();

  // start tss instance
  startTssInstance();

  // run network scanners
  initScanner();
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // run processors
  runProcessors();

  // initialize guard health check
  await healthCheckStart();
};

init().then(() => null);
