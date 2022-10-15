import { reset, spy, when } from 'ts-mockito';
import { expect } from 'chai';
import { resetGuardTurn } from '../testUtils/MockedGuardTurn';
import GuardTurn from '../../src/helpers/GuardTurn';

describe('guard turn methods', () => {
  const currentTimeStamp = 1658005354291000;

  beforeEach('reset isEventConfirmedEnough mock', () => {
    resetGuardTurn();
  });

  it('secondsToNextTurn should return seconds to guard next turn successfully', () => {
    // mock Date
    const date = spy(Date);
    when(date.now()).thenReturn(currentTimeStamp);

    // run test
    const result = GuardTurn.secondsToNextTurn();
    expect(result).to.equal(1050);

    // reset mocked Date object
    reset(date);
  });

  it('guardTurn should return guard turn successfully', () => {
    // mock Date
    const date = spy(Date);
    when(date.now()).thenReturn(currentTimeStamp);

    // run test
    const result = GuardTurn.guardTurn();
    expect(result).to.equal(2);

    // reset mocked Date object
    reset(date);
  });

  it('secondsToReset should return seconds to end of current guard turn successfully', () => {
    // mock Date
    const date = spy(Date);
    when(date.now()).thenReturn(currentTimeStamp);

    // run test
    const result = GuardTurn.secondsToReset();
    expect(result).to.equal(90);

    // reset mocked Date object
    reset(date);
  });
});
