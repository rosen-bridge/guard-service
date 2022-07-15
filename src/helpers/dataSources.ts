import { signOrmDataSource } from "../../config/signOrmDataSource";
import { scannerOrmDataSource } from "../../config/scannerOrmDataSource";

const initDataSources = async (): Promise<void> => {
    try {
        await signOrmDataSource.initialize();
        await signOrmDataSource.runMigrations();
        console.log("Sign Data Source has been initialized!")
    }catch (err){
        console.error("Error during Sign Data Source initialization:", err);
    }

    try {
        await scannerOrmDataSource.initialize();
        await scannerOrmDataSource.runMigrations();
        console.log("Scanner Data Source has been initialized!")
    }catch (err){
        console.error("Error during Scanner Data Source initialization:", err);
    }
}

export { initDataSources }
