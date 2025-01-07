import './bootstrap';
// import { initDataSources } from './jobs/dataSources';
// import { initializeMultiSigJobs } from './jobs/multiSig';
// import { initApiServer } from './jobs/apiServer';
// import { runProcessors } from './jobs/runProcessors';
// import Configs from './configs/Configs';
// import { initScanner } from './jobs/initScanner';
// import { healthCheckStart } from './jobs/healthCheck';
// import ChainHandler from './handlers/ChainHandler';
// import TxAgreement from './agreement/TxAgreement';
// import MultiSigHandler from './guard/multisig/MultiSigHandler';
// import { configUpdateJob } from './jobs/guardConfigUpdate';
// import MultiSigUtils from './guard/multisig/MultiSigUtils';
// import { DatabaseAction } from './db/DatabaseAction';
// import { dataSource } from './db/dataSource';
// import Tss from './guard/Tss';
// import { tssUpdateJob } from './jobs/tss';
// import { revenueJob } from './jobs/revenue';
// import GuardPkHandler from './handlers/GuardPkHandler';
// import MinimumFeeHandler from './handlers/MinimumFeeHandler';
// import { minimumFeeUpdateJob } from './jobs/minimumFee';
// import { NotificationHandler } from './handlers/NotificationHandler';
// import EventSynchronization from './synchronization/EventSynchronization';
import DetectionHandler from './handlers/DetectionHandler';
import RosenDialer from './communication/RosenDialer';
import Configs from './configs/Configs';

const init = async () => {
  // initialize NotificationHandler object
  // NotificationHandler.setup();

  // initialize all data sources
  // await initDataSources();

  // initialize DatabaseAction
  // const dbAction = DatabaseAction.init(dataSource);

  // initialize express Apis
  // await initApiServer();

  // initialize Dialer and DetectionHandler
  await RosenDialer.getInstance();
  await DetectionHandler.init();

  const node = await RosenDialer.getInstance();
  console.log(node.getPeerIds());
  node.subscribeChannel(
    'test',
    (msg: string, channel: string, sender: string) => {
      console.log('CHECK');
      console.log(msg);
      console.log(channel);
      console.log(sender);
    }
  );
  //
  // const detectionUpdateJob = () => {
  //   DetectionHandler.getInstance()
  //     .update()
  //     .then(() =>
  //       setTimeout(detectionUpdateJob, Configs.detectionUpdateInterval * 1000)
  //     )
  //     .catch((e) => {
  //       setTimeout(detectionUpdateJob, Configs.detectionUpdateInterval * 1000);
  //     });
  // };
  //
  // setTimeout(detectionUpdateJob, Configs.detectionUpdateInterval * 1000);

  //
  // // initialize tss multiSig object
  // await MultiSigHandler.init(Configs.guardSecret);
  // initializeMultiSigJobs();
  //
  // // start tss instance
  // await Tss.init();
  // tssUpdateJob();
  //
  // // initialize chain objects
  // const chainHandler = ChainHandler.getInstance();
  // MultiSigUtils.getInstance().init(chainHandler.getErgoChain().getStateContext);
  //
  // // guard config update job
  // const pkHandler = GuardPkHandler.getInstance();
  // await pkHandler.update();
  // pkHandler.updateDependentModules();
  // setTimeout(configUpdateJob, Configs.guardConfigUpdateInterval * 1000);
  //
  // // initialize TxAgreement object
  // await TxAgreement.getInstance();
  //
  // // initialize EventSynchronization object
  // await EventSynchronization.init();
  //
  // // initialize MinimumFeeHandler
  // await MinimumFeeHandler.init(Configs.tokens());
  // minimumFeeUpdateJob();
  //
  // // run network scanners
  // initScanner();
  //
  // // run processors
  // runProcessors();
  //
  // // initialize guard health check
  // await healthCheckStart();
  //
  // // run revenue job
  // await revenueJob();
};

init().then(() => null);
