import * as childProcess from "child_process"
import Configs from "../helpers/Configs";
const exec = childProcess.exec

/**
 * starts tss instance
 */
const startTssInstance = function() {
    const tssPath =
        Configs.tssExecutionPath +
        ' -configFile ' + Configs.tssConfigPath +
        ' -p2pPort ' + Configs.expressPort +
        ' -port ' + Configs.tssPort

    exec(tssPath, function(err, data) {
        if (err !== null) {
            console.log(`Failed to start TSS instance: [${err}] [${data}]`)
            // wait 5 seconds to start again
            setTimeout(startTssInstance, 5000)
        }
    });
}

export { startTssInstance }
