import { scannerOrmDataSource } from "../../config/scannerOrmDataSource";

const initDataSources = async (): Promise<void> => {
    try {
        await scannerOrmDataSource.initialize();
        await scannerOrmDataSource.runMigrations();
        console.log("Scanner Data Source has been initialized!")
    } catch (err) {
        console.error("Error during Scanner Data Source initialization:", err);
    }
}

export { initDataSources }
