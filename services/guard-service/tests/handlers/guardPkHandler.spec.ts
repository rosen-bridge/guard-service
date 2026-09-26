import Configs from '../../src/configs/configs';
import ChainHandler from '../../src/handlers/chainHandler';

vi.mock('../../src/handlers/multiSigHandler', () => ({
  default: {
    getInstance: () => ({
      getErgoMultiSig: () => ({ handlePublicKeysChange: vi.fn() }),
    }),
  },
}));

const { default: GuardPkHandler } = await vi.importActual<
  typeof import('../../src/handlers/guardPkHandler')
>('../../src/handlers/guardPkHandler');

const handler = GuardPkHandler.getInstance();
const previousPolicy = {
  publicKeys: ['previous-guard-0', 'previous-guard-1'],
  requiredSign: 2,
  guardsLen: 2,
  guardId: 1,
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const setErgoGuardConfig = (getGuardsPkConfig: ReturnType<typeof vi.fn>) => {
  vi.spyOn(ChainHandler, 'getInstance').mockReturnValue({
    getErgoChain: () => ({ getGuardsPkConfig }),
  } as unknown as ChainHandler);
};

describe('GuardPkHandler.update', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.assign(handler, {
      ...previousPolicy,
      publicKeys: [...previousPolicy.publicKeys],
    });
  });

  it('keeps the previous policy visible while membership is pending and after it fails', async () => {
    const proposedKeys = ['new-guard-0', 'new-guard-1', 'new-guard-2'];
    const getGuardsPkConfig = vi.fn().mockResolvedValue({
      publicKeys: proposedKeys,
      requiredSigns: 3,
    });
    setErgoGuardConfig(getGuardsPkConfig);
    const localPublicKey = deferred<string>();
    const getPk = vi
      .spyOn(Configs.guardSecretEcdsa, 'getPk')
      .mockReturnValue(localPublicKey.promise);

    const update = handler.update();
    await vi.waitFor(() => expect(getPk).toHaveBeenCalledOnce());

    expect(handler).toMatchObject(previousPolicy);

    localPublicKey.resolve('not-a-configured-guard');
    await expect(update).rejects.toThrow(
      "The guard public key doesn't exist in current service guard config",
    );
    expect(handler).toMatchObject(previousPolicy);
  });

  it('publishes copied ordered keys and the matching policy only after validation succeeds', async () => {
    const proposedKeys = ['new-guard-0', 'local-guard', 'new-guard-2'];
    const getGuardsPkConfig = vi.fn().mockResolvedValue({
      publicKeys: proposedKeys,
      requiredSigns: 2,
    });
    setErgoGuardConfig(getGuardsPkConfig);
    vi.spyOn(Configs.guardSecretEcdsa, 'getPk').mockResolvedValue(
      'local-guard',
    );

    await handler.update();

    expect(handler).toMatchObject({
      publicKeys: proposedKeys,
      requiredSign: 2,
      guardsLen: 3,
      guardId: 1,
    });
    expect(handler.publicKeys).not.toBe(proposedKeys);
    proposedKeys[1] = 'mutated-after-publication';
    expect(handler.publicKeys[1]).toBe('local-guard');
  });

  it('publishes the captured config when its backend object changes during key lookup', async () => {
    const proposedKeys = ['new-guard-0', 'local-guard', 'new-guard-2'];
    const proposedConfig = {
      publicKeys: proposedKeys,
      requiredSigns: 2,
    };
    const getGuardsPkConfig = vi
      .fn()
      .mockResolvedValueOnce(proposedConfig)
      .mockResolvedValueOnce({
        publicKeys: ['replacement-guard'],
        requiredSigns: 1,
      });
    setErgoGuardConfig(getGuardsPkConfig);
    const localPublicKey = deferred<string>();
    const getPk = vi
      .spyOn(Configs.guardSecretEcdsa, 'getPk')
      .mockReturnValueOnce(localPublicKey.promise)
      .mockRejectedValueOnce(new Error('local key unavailable'));

    const update = handler.update();
    await vi.waitFor(() => expect(getPk).toHaveBeenCalledOnce());
    proposedKeys.splice(
      0,
      proposedKeys.length,
      'local-guard',
      'mutated-guard',
      'new-guard-0',
    );
    proposedConfig.requiredSigns = 1;
    localPublicKey.resolve('local-guard');

    await update;
    const capturedPolicy = {
      publicKeys: ['new-guard-0', 'local-guard', 'new-guard-2'],
      requiredSign: 2,
      guardsLen: 3,
      guardId: 1,
    };
    expect(handler).toMatchObject(capturedPolicy);

    await expect(handler.update()).rejects.toThrow('local key unavailable');
    expect(handler).toMatchObject(capturedPolicy);
  });

  it('stays uninitialized when the guard-config backend fails', async () => {
    Reflect.deleteProperty(handler, 'publicKeys');
    Reflect.deleteProperty(handler, 'requiredSign');
    Reflect.deleteProperty(handler, 'guardsLen');
    Reflect.deleteProperty(handler, 'guardId');
    const getGuardsPkConfig = vi
      .fn()
      .mockRejectedValue(new Error('guard-config unavailable'));
    setErgoGuardConfig(getGuardsPkConfig);
    const getPk = vi.spyOn(Configs.guardSecretEcdsa, 'getPk');

    await expect(handler.update()).rejects.toThrow('guard-config unavailable');

    expect(handler.publicKeys).toBeUndefined();
    expect(handler.requiredSign).toBeUndefined();
    expect(handler.guardsLen).toBeUndefined();
    expect(handler.guardId).toBeUndefined();
    expect(getPk).not.toHaveBeenCalled();
  });
});
