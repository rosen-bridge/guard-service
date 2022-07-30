import * as childProcess from "child_process"
import Configs from "../helpers/Configs";
const exec = childProcess.exec

export const tssInstance = function() {
    const tssPath = './bin/tss.exe -configFile ./bin/conf/conf.env -p2pPort ' + Configs.expressPort + ' -port ' + Configs.tssPort

    exec(tssPath, function(err, data) {
        console.log(err)
        console.log(data.toString());
        // TODO: Add delay before restarting?
        tssInstance()
    });
    console.log("Tss instance started");
}
