import { signOrmDataSource } from "../../config/signOrmDataSource";

const initDataSources = async (): Promise<void> => {
    await signOrmDataSource
        .initialize()
        .then(async () => {
            await signOrmDataSource.runMigrations()
            console.log("Sign Data Source has been initialized!");
        })
        .catch((err) => {
            console.error("Error during Sign Data Source initialization:", err);
        });
}

export { initDataSources }
