import ChainHandler from '../../src/handlers/ChainHandler';
import { chainHandlerInstance } from '../handlers/ChainHandler.mock';

vi.spyOn(ChainHandler, 'getInstance').mockReturnValue(
  chainHandlerInstance as unknown as ChainHandler
);
