import { spy, when } from 'ts-mockito';

/**
 * Please make sure `MockedDialer` import comes before `GuardConfig`, as the
 * latter depends a mocked `Dialer` to work as expected.
 */
import { resetDialerCalls } from './communication/mocked/MockedDialer';
import { guardConfig } from '../src/helpers/GuardConfig';
import { guardPks } from './helpers/testData';

export async function mochaGlobalSetup() {
  const spyGuardConfig = spy(guardConfig);
  when(spyGuardConfig.publicKeys).thenReturn(guardPks);
  when(spyGuardConfig.requiredSign).thenReturn(5);
  when(spyGuardConfig.guardsLen).thenReturn(7);
  when(spyGuardConfig.guardId).thenReturn(1);

  resetDialerCalls();
}
