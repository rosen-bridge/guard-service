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
import MultiSigHandler from './handlers/MultiSigHandler';
import { configUpdateJob } from './jobs/guardConfigUpdate';
import { DatabaseAction } from './db/DatabaseAction';
import { dataSource } from './db/dataSource';
import { tssUpdateJob } from './jobs/tss';
import { revenueJob } from './jobs/revenue';
import GuardPkHandler from './handlers/GuardPkHandler';
import MinimumFeeHandler from './handlers/MinimumFeeHandler';
import { minimumFeeUpdateJob } from './jobs/minimumFee';
import { NotificationHandler } from './handlers/NotificationHandler';
import RosenDialer from './communication/RosenDialer';
import EventSynchronization from './synchronization/EventSynchronization';
import DetectionHandler from './handlers/DetectionHandler';
import EventReprocess from './reprocess/EventReprocess';
import ArbitraryProcessor from './arbitrary/ArbitraryProcessor';
import TssHandler from './handlers/TssHandler';
import { TokenHandler } from './handlers/tokenHandler';

const init = async () => {
  // initialize tokens config
  await TokenHandler.init(Configs.tokensPath);

  // initialize NotificationHandler object
  NotificationHandler.setup();

  // initialize all data sources
  await initDataSources();

  // initialize DatabaseAction
  DatabaseAction.init(dataSource);

  // initialize Dialer
  await RosenDialer.init();

  // initialize express Apis
  await initApiServer();

  // initialize DetectionHandler
  await DetectionHandler.init();

  // initialize tss multiSig object
  await MultiSigHandler.init();
  initializeMultiSigJobs();

  // start tss instance
  await TssHandler.init();
  tssUpdateJob();

  // initialize chain objects
  ChainHandler.getInstance();

  // guard config update job
  const pkHandler = GuardPkHandler.getInstance();
  await pkHandler.update();
  pkHandler.updateDependentModules();
  setTimeout(configUpdateJob, Configs.guardConfigUpdateInterval * 1000);

  // initialize TxAgreement object
  await TxAgreement.getInstance();

  // initialize ArbitraryProcessor object
  ArbitraryProcessor.getInstance();

  // initialize EventSynchronization object
  await EventSynchronization.init();

  // initialize EventReprocess object
  await EventReprocess.init();

  // initialize MinimumFeeHandler
  await MinimumFeeHandler.init(TokenHandler.getInstance().getTokenMap());
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
