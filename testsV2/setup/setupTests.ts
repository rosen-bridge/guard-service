import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';

// TODO: database setup should be in global setup
//  using it as normal setup will cuz 'Migration failed` error
//  while initializing test datasource (#208)
await DatabaseActionMock.initDatabase();
