import { MultiSigUtils } from '@rosen-bridge/ergo-multi-sig';

import TxAgreement from './agreement/txAgreement';
import ArbitraryProcessor from './arbitrary/arbitraryProcessor';
import './bootstrap';
import RosenDialer from './communication/rosenDialer';
import Configs from './configs/configs';
import { DatabaseAction } from './db/databaseAction';
import { dataSource } from './db/dataSource';
import BalanceHandler from './handlers/balanceHandler';
import ChainHandler from './handlers/chainHandler';
import DetectionHandler from './handlers/detectionHandler';
import GuardPkHandler from './handlers/guardPkHandler';
import MinimumFeeHandler from './handlers/minimumFeeHandler';
import MultiSigHandler from './handlers/multiSigHandler';
import { NotificationHandler } from './handlers/notificationHandler';
import { TokenHandler } from './handlers/tokenHandler';
import TssHandler from './handlers/tssHandler';
import { initApiServer } from './jobs/apiServer';
import { initDataSources } from './jobs/dataSources';
import { configUpdateJob } from './jobs/guardConfigUpdate';
import { healthCheckStart } from './jobs/healthCheck';
import { initScanner } from './jobs/initScanner';
import { minimumFeeUpdateJob } from './jobs/minimumFee';
import { initializeMultiSigJobs } from './jobs/multiSig';
import { revenueJob } from './jobs/revenue';
import { runProcessors } from './jobs/runProcessors';
import { tssUpdateJob } from './jobs/tss';
import EventReprocess from './reprocess/eventReprocess';
import EventSynchronization from './synchronization/eventSynchronization';

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
