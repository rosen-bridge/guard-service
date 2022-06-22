import path from 'path';
import { DataSource } from "typeorm";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const signOrmConfig = new DataSource({
    type: "sqlite",
    database: __dirname + "/../sqlite/sign.sqlite",
    entities: ['src/db/entities/sign/*.ts'],
    migrations: ['src/db/migrations/sign/*.ts'],
    synchronize: false,
    logging: false
});
