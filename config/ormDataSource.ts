import path from 'path';
import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TODO: datasource config
//  fix entities directories
//  fix migrations (use package migrations)
//  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/18
export const ormDataSource = new DataSource({
  type: 'sqlite',
  database: __dirname + '/../sqlite/db.sqlite',
  entities: [
    'src/db/entities/*.ts',
    'node_modules/@rosen-bridge/scanner/dist/entities/*.js',
    'node_modules/@rosen-bridge/watcher-data-extractor/dist/entities/*.js',
  ],
  migrations: ['src/db/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
