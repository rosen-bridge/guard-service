import { DataSource } from "typeorm";
import { signEntities } from "../src/entities";
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const signOrmConfig = new DataSource({
    type: "sqlite",
    database: __dirname + "/../sqlite/sign.sqlite",
    entities: signEntities,
    migrations: [],
    synchronize: true,
    logging: false,
});
