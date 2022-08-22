import * as childProcess from "child_process"
import Configs from "../helpers/Configs";
const exec = childProcess.exec

/**
 * starts tss instance
 */
const startTssInstance = function() {
    const tssPath = './bin/tss.exe -configFile ./bin/conf/conf.env -p2pPort ' + Configs.expressPort + ' -port ' + Configs.tssPort

    exec(tssPath, function(err, data) {
        console.log(err)
        console.log(data.toString());

        // wait 5 seconds to start again
        setTimeout(startTssInstance, 5000)
    });
    console.log("Tss instance started");
}

export { startTssInstance }
