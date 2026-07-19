import { TokenEntity } from '../../src/db/entities/tokenEntity';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import { fillTokenEntity } from '../../src/utils/fillTokenEntity';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import { mapTokenSet, mockTokens, mockTokenSet } from './testData';

describe('fillTokenEntity', () => {
  beforeEach(async () => {
    await DatabaseActionMock.testDatabase.TokenRepository.clear();
  });

  /**
   * @target fillTokenEntity should insert the token map tokens into database
   * @dependencies
   * - TokenHandler
   * - DataSource
   * @scenario
   * - call fillTokenEntity
   * - get all tokens from database
   * - check returned value
   * @expected
   * - returned tokens should match the tokens from test token map json
   */
  it('should insert the token map tokens into database', async () => {
    // act
    const tokenMap = TokenHandler.getInstance().getTokenMap().getRawConfig();
    await fillTokenEntity(DatabaseActionMock.testDataSource, tokenMap);

    const result = await DatabaseActionMock.testDataSource
      .getRepository(TokenEntity)
      .find();

    // assert
    expect(result).toEqual(mockTokens);
  });

  /**
   * @target fillTokenEntity should not insert duplicate tokens from token map into database
   * @dependencies
   * - TokenHandler
   * - DataSource
   * @scenario
   * - call fillTokenEntity
   * - call fillTokenEntity again
   * - get all tokens from database
   * - check returned value
   * @expected
   * - returned tokens should match the tokens from test token map json
   */
  it('should not insert duplicate tokens from token map into database', async () => {
    // arrange
    const tokenMap = TokenHandler.getInstance().getTokenMap().getRawConfig();
    await fillTokenEntity(DatabaseActionMock.testDataSource, tokenMap);

    // act
    await fillTokenEntity(DatabaseActionMock.testDataSource, tokenMap);

    const result = await DatabaseActionMock.testDataSource
      .getRepository(TokenEntity)
      .find();

    // assert
    expect(result).toEqual(mockTokens);
  });

  /**
   * @target fillTokenEntity should insert new tokens from token map into database while ignoring duplicate tokens
   * @dependencies
   * - TokenHandler
   * - DataSource
   * @scenario
   * - call fillTokenEntity
   * - call fillTokenEntity again containing a new tokenSet
   * - get all tokens from database
   * - check returned value
   * @expected
   * - returned tokens should match the tokens from test token map json and the new token set
   */
  it('should insert new tokens from token map into database while ignoring duplicate tokens', async () => {
    // arrange
    const tokenMap = TokenHandler.getInstance().getTokenMap().getRawConfig();
    await fillTokenEntity(DatabaseActionMock.testDataSource, tokenMap);

    // act
    await fillTokenEntity(DatabaseActionMock.testDataSource, [
      ...tokenMap,
      mockTokenSet,
    ]);

    const result = await DatabaseActionMock.testDataSource
      .getRepository(TokenEntity)
      .find();

    // assert
    expect(result).toEqual([...mockTokens, ...mapTokenSet(mockTokenSet)]);
  });
});
