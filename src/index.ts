import './bootstrap';
import { initDataSources } from './jobs/dataSources';
import { initializeMultiSigJobs } from './jobs/multiSig';
import { initApiServer } from './jobs/apiServer';
import { runProcessors } from './jobs/runProcessors';
import Configs from './configs/configs';
import { initScanner } from './jobs/initScanner';
import { healthCheckStart } from './jobs/healthCheck';
import ChainHandler from './handlers/chainHandler';
import TxAgreement from './agreement/txAgreement';
import MultiSigHandler from './handlers/multiSigHandler';
import { configUpdateJob } from './jobs/guardConfigUpdate';
import { DatabaseAction } from './db/databaseAction';
import { dataSource } from './db/dataSource';
import { tssUpdateJob } from './jobs/tss';
import { revenueJob } from './jobs/revenue';
import GuardPkHandler from './handlers/guardPkHandler';
import MinimumFeeHandler from './handlers/minimumFeeHandler';
import { minimumFeeUpdateJob } from './jobs/minimumFee';
import { NotificationHandler } from './handlers/notificationHandler';
import RosenDialer from './communication/rosenDialer';
import EventSynchronization from './synchronization/eventSynchronization';
import DetectionHandler from './handlers/detectionHandler';
import EventReprocess from './reprocess/eventReprocess';
import ArbitraryProcessor from './arbitrary/arbitraryProcessor';
import TssHandler from './handlers/tssHandler';
import { TokenHandler } from './handlers/tokenHandler';
import BalanceHandler from './handlers/balanceHandler';
import { MultiSigUtils } from '@rosen-bridge/ergo-multi-sig';

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

  // initialize multiSig utils object
  const multiSigUtils = new MultiSigUtils(() =>
    ChainHandler.getInstance().getErgoChain().getStateContext(),
  );
  // initialize tss multiSig object
  await MultiSigHandler.init(multiSigUtils);
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

  // initialize BalanceHandler
  BalanceHandler.init();

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
