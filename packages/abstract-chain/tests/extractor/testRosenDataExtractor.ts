import {
  AbstractRosenDataExtractor,
  RosenData,
} from '@rosen-bridge/rosen-extractor';
import { TokenMap } from '@rosen-bridge/tokens';

class TestRosenDataExtractor extends AbstractRosenDataExtractor<string> {
  readonly chain = 'test';
  constructor() {
    super('', new TokenMap());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  extractData = (tx: string): RosenData | undefined => {
    throw Error(`not mocked`);
  };
}

export default TestRosenDataExtractor;
