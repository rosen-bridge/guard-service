import { ormDataSource } from "../../config/ormDataSource";
import { logger } from "../log/Logger";

const initDataSources = async (): Promise<void> => {
    try {
        await ormDataSource.initialize();
        await ormDataSource.runMigrations();
        logger.info('Data Source has been initialized!')
    } catch (err) {
        logger.log('fatal', 'An error occurred, during Data Source initialization', {error: err})
    }
}

export { initDataSources }
