import { ormDataSource } from "../../config/ormDataSource";

const initDataSources = async (): Promise<void> => {
    try {
        await ormDataSource.initialize();
        await ormDataSource.runMigrations();
        console.log("Data Source has been initialized!")
    } catch (err) {
        console.error("Error during Data Source initialization:", err);
    }
}

export { initDataSources }
