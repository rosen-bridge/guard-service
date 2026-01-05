import ChainHandler from '../../src/handlers/chainHandler';
import { chainHandlerInstance } from '../handlers/chainHandler.mock';

vi.spyOn(ChainHandler, 'getInstance').mockReturnValue(
  chainHandlerInstance as unknown as ChainHandler,
);
