import Configs from '../configs/Configs';
import Tss from '../guard/Tss';

/**
 * runs Tss service update job
 */
const tssUpdateJob = () => {
  Tss.getInstance()
    .update()
    .then(() => setTimeout(tssUpdateJob, Configs.tssUpdateInterval * 1000));
};

export { tssUpdateJob };
