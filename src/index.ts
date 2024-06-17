import './bootstrap';
import { initDataSources } from './jobs/dataSources';
import { initializeMultiSigJobs } from './jobs/multiSig';
import { initApiServer } from './jobs/apiServer';
import { runProcessors } from './jobs/runProcessors';
import Configs from './configs/Configs';
import { initScanner } from './jobs/initScanner';
import { healthCheckStart } from './jobs/healthCheck';
import ChainHandler from './handlers/ChainHandler';
import TxAgreement from './agreement/TxAgreement';
import Notification from './communication/notification/Notification';
import MultiSigHandler from './guard/multisig/MultiSigHandler';
import { configUpdateJob } from './jobs/guardConfigUpdate';
import MultiSigUtils from './guard/multisig/MultiSigUtils';
import { DatabaseAction } from './db/DatabaseAction';
import { dataSource } from './db/dataSource';
import Tss from './guard/Tss';
import { tssUpdateJob } from './jobs/tss';
import { revenueJob } from './jobs/revenue';
import GuardPkHandler from './handlers/GuardPkHandler';
import MinimumFeeHandler from './handlers/MinimumFeeHandler';
import { minimumFeeUpdateJob } from './jobs/minimumFee';

const init = async () => {
  // initialize Notification object
  await Notification.getInstance();

  // initialize all data sources
  await initDataSources();

  // initialize DatabaseAction
  const dbAction = DatabaseAction.init(dataSource);

  // initialize express Apis
  await initApiServer();

  // initialize tss multiSig object
  await MultiSigHandler.init(Configs.guardSecret);
  initializeMultiSigJobs();

  // start tss instance
  await Tss.init();
  tssUpdateJob();

  // initialize chain objects
  const chainHandler = ChainHandler.getInstance();
  MultiSigUtils.getInstance().init(chainHandler.getErgoChain().getStateContext);

  // guard config update job
  const pkHandler = GuardPkHandler.getInstance();
  await pkHandler.update();
  pkHandler.updateDependentModules();
  setTimeout(configUpdateJob, Configs.guardConfigUpdateInterval * 1000);

  // initialize TxAgreement object
  await TxAgreement.getInstance();

  // initialize MinimumFeeHandler
  await MinimumFeeHandler.init(Configs.tokens());
  minimumFeeUpdateJob();

  // run network scanners
  initScanner();

  // run processors
  runProcessors();

  // initialize guard health check
  await healthCheckStart();

  // run revenue job
  await revenueJob();
};

init().then(() => null);
