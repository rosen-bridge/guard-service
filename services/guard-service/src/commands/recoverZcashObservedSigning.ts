import { createHash, randomUUID } from 'node:crypto';
import {
  constants as fsConstants,
  closeSync,
  copyFileSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { Socket } from 'node:net';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { backup as sqliteBackup, DatabaseSync } from 'node:sqlite';

const MAX_CANDIDATE_BYTES = 8_000_000;
const HEX32 = /^[0-9a-f]{64}$/;

interface Options {
  txId: string;
  database: string;
  backupDestination: string;
  signedPayout: string;
  reward: string;
}

const refuse = (reason: string): never => {
  throw Error(`Zcash recovery refused: ${reason}`);
};

function parseArgs(args: string[]): Options {
  const values = new Map<string, string>();
  let stopped = false;
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (key === '--guard-stopped') {
      if (stopped) refuse('duplicate guard-stopped flag');
      stopped = true;
      continue;
    }
    if (
      ![
        '--tx-id',
        '--database',
        '--backup-destination',
        '--signed-payout',
        '--reward',
      ].includes(key) ||
      values.has(key) ||
      index + 1 >= args.length ||
      args[index + 1].startsWith('--')
    )
      refuse('arguments');
    values.set(key, args[++index]);
  }
  if (!stopped || values.size !== 5) refuse('guard stop or arguments');
  const txId = values.get('--tx-id')!;
  if (!HEX32.test(txId)) refuse('transaction id');
  return {
    txId,
    database: values.get('--database')!,
    backupDestination: values.get('--backup-destination')!,
    signedPayout: values.get('--signed-payout')!,
    reward: values.get('--reward')!,
  };
}

const canonical = (path: string): string => realpathSync.native(resolve(path));
const samePath = (left: string, right: string): boolean =>
  process.platform === 'win32'
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;

function readCandidate(path: string): string {
  const file = canonical(path);
  const size = statSync(file).size;
  if (size < 1 || size > MAX_CANDIDATE_BYTES) refuse('candidate size');
  return readFileSync(file, 'utf8');
}

const query = (
  database: DatabaseSync,
  sql: string,
  params: Array<string | number> = [],
): Record<string, unknown>[] =>
  database.prepare(sql).all(...params) as Record<string, unknown>[];

const pathPresent = (path: string): boolean => {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
};

const assertNoSidecars = (path: string): void => {
  for (const suffix of ['-wal', '-shm', '-journal'])
    if (pathPresent(`${path}${suffix}`)) refuse('backup sidecar exists');
};

const sha256File = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

const fsyncPath = (path: string, directory = false): void => {
  // Windows FlushFileBuffers requires a writable handle, including for a
  // directory. POSIX directories must be opened read-only.
  const descriptor = openSync(
    path,
    directory && process.platform !== 'win32' ? 'r' : 'r+',
  );
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
};

function prepareBackupDestination(activePath: string, requested: string) {
  if (!isAbsolute(requested)) refuse('backup destination must be absolute');
  const parent = canonical(dirname(requested));
  if (!statSync(parent).isDirectory()) refuse('backup parent directory');
  if (statSync(parent).dev === statSync(activePath).dev)
    refuse('backup destination must be on another volume');
  const destination = join(parent, basename(requested));
  if (samePath(destination, activePath) || pathPresent(destination))
    refuse('backup destination already exists');
  assertNoSidecars(destination);
  return destination;
}

const assertBackupIntegrity = (path: string): void => {
  const database = new DatabaseSync(path, { readOnly: true });
  try {
    const result = query(database, 'PRAGMA integrity_check');
    if (result.length !== 1 || result[0].integrity_check !== 'ok')
      refuse('backup SQLite integrity');
  } finally {
    database.close();
  }
};

async function createBackup(activePath: string, destination: string) {
  const temporary = `${destination}.temporary-${randomUUID()}`;
  if (pathPresent(temporary)) refuse('temporary backup path collision');
  assertNoSidecars(temporary);
  try {
    const source = new DatabaseSync(activePath, { readOnly: true });
    try {
      await sqliteBackup(source, temporary);
    } finally {
      source.close();
    }
    if (statSync(temporary).size < 1) refuse('empty SQLite backup');
    assertNoSidecars(temporary);
    assertBackupIntegrity(temporary);
    const temporarySha256 = sha256File(temporary);
    copyFileSync(temporary, destination, fsConstants.COPYFILE_EXCL);
    fsyncPath(destination);
    fsyncPath(dirname(destination), true);
    assertNoSidecars(destination);
    assertBackupIntegrity(destination);
    const finalSha256 = sha256File(destination);
    if (temporarySha256 !== finalSha256) refuse('backup copy digest mismatch');
    return finalSha256;
  } finally {
    if (pathPresent(temporary)) {
      unlinkSync(temporary);
      fsyncPath(dirname(destination), true);
    }
  }
}

function assertMatchingBackup(
  activePath: string,
  backupPath: string,
  txId: string,
) {
  const active = new DatabaseSync(activePath, { readOnly: true });
  try {
    const backup = new DatabaseSync(backupPath, { readOnly: true });
    try {
      const integrity = query(backup, 'PRAGMA integrity_check');
      if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok')
        refuse('backup SQLite integrity');
      const pair = (label: string, sql: string, key: string | number) => {
        const current = query(active, sql, [key]);
        const saved = query(backup, sql, [key]);
        if (
          current.length !== 1 ||
          saved.length !== 1 ||
          JSON.stringify(current[0]) !== JSON.stringify(saved[0])
        )
          refuse(`backup ${label} prestate mismatch`);
        return current[0];
      };
      const payment = pair(
        'payment',
        'SELECT * FROM transaction_entity WHERE txId = ?',
        txId,
      );
      const eventId =
        typeof payment.eventId === 'string'
          ? payment.eventId
          : refuse('active payment event');
      const attemptId =
        typeof payment.signingAttemptId === 'string'
          ? payment.signingAttemptId
          : refuse('active payment attempt');
      if (
        payment.chain !== 'zcash' ||
        payment.type !== 'payment' ||
        payment.status !== 'in-sign'
      )
        refuse('active payment prestate');
      const attempt = pair(
        'attempt',
        'SELECT * FROM zcash_signing_attempt_entity WHERE attemptId = ?',
        attemptId,
      );
      if (
        attempt.txId !== txId ||
        attempt.activeTxId !== txId ||
        attempt.state !== 'may_dispatch' ||
        attempt.signedJson !== null
      )
        refuse('active signing prestate');
      const event = pair(
        'event',
        'SELECT * FROM confirmed_event_entity WHERE id = ?',
        eventId,
      );
      if (
        event.status !== 'in-payment' ||
        event.zcashSigningAttemptId !== attemptId
      )
        refuse('active event prestate');
      const eventDataId =
        typeof event.eventDataId === 'number' &&
        Number.isSafeInteger(event.eventDataId)
          ? event.eventDataId
          : refuse('active event trigger');
      const trigger = pair(
        'trigger',
        'SELECT * FROM event_trigger_entity WHERE id = ?',
        eventDataId,
      );
      if (
        trigger.result !== 'successful' ||
        trigger.paymentTxId !== txId ||
        typeof trigger.spendTxId !== 'string' ||
        typeof trigger.spendBlock !== 'string' ||
        !Number.isSafeInteger(trigger.spendHeight)
      )
        refuse('active spent-trigger prestate');
      for (const [label, sql] of [
        [
          'settlement',
          'SELECT * FROM zcash_settlement_entity WHERE eventId = ?',
        ],
        [
          'reward',
          "SELECT * FROM transaction_entity WHERE eventId = ? AND chain = 'ergo' AND type = 'reward'",
        ],
      ]) {
        const current = query(active, sql, [eventId]);
        const saved = query(backup, sql, [eventId]);
        if (current.length !== 0 || saved.length !== 0)
          refuse(`backup ${label} prestate mismatch`);
      }
    } finally {
      backup.close();
    }
  } finally {
    active.close();
  }
}

async function portListening(host: string, port: number): Promise<boolean> {
  return new Promise((resolvePort, rejectPort) => {
    const socket = new Socket();
    let settled = false;
    const finish = (error?: Error, listening = false) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) rejectPort(error);
      else resolvePort(listening);
    };
    socket.setTimeout(1_200, () => finish(Error('API probe timed out')));
    socket.once('connect', () => finish(undefined, true));
    socket.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ECONNREFUSED') finish();
      else finish(error);
    });
    socket.connect(port, host);
  });
}

async function assertGuardApiStopped(host: string, port: number) {
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535)
    refuse('configured API port');
  const hosts = new Set(['127.0.0.1', '::1']);
  if (!['0.0.0.0', '::', 'localhost'].includes(host)) hosts.add(host);
  for (const candidate of hosts)
    if (await portListening(candidate, port)) refuse('guard API is listening');
}

async function main() {
  if (process.argv.length === 3 && process.argv[2] === '--help') {
    process.stdout.write(
      'Usage: npm run recover:zcash-observed-signing -- --tx-id <hex> --database <configured-sqlite-path> --backup-destination <new-sqlite-path-on-another-volume> --signed-payout <exact-json-file> --reward <exact-json-file> --guard-stopped\n' +
        'Stop the guard service and prevent its supervisor from restarting it until this command exits. The API probe cannot prevent a concurrent restart. No signing or broadcasting occurs.\n',
    );
    return;
  }
  const options = parseArgs(process.argv.slice(2));
  const { DefaultLogger, DummyLogger } = await import(
    '@rosen-bridge/abstract-logger'
  );
  DefaultLogger.init(new DummyLogger());

  const [
    { default: Configs },
    { default: GuardsErgoConfigs },
    { default: GuardsZcashConfigs },
  ] = await Promise.all([
    import('../configs/configs'),
    import('../configs/guardsErgoConfigs'),
    import('../configs/guardsZcashConfigs'),
  ]);
  if (Configs.dbType !== 'sqlite') refuse('configured database must be SQLite');
  const database = canonical(options.database);
  const configuredDatabase = canonical(Configs.dbPath);
  if (!samePath(database, configuredDatabase)) refuse('database path mismatch');
  if (statSync(database).size < 1) refuse('empty database');
  const backup = prepareBackupDestination(database, options.backupDestination);
  if (GuardsErgoConfigs.chainNetworkName !== 'node')
    refuse('Ergo source must be a node');
  await assertGuardApiStopped(Configs.apiHost, Configs.apiPort);
  const actualBackupSha256 = await createBackup(database, backup);
  assertMatchingBackup(database, backup, options.txId);
  process.stdout.write(
    `${JSON.stringify({ backupCreated: true, path: backup, sha256: actualBackupSha256 })}\n`,
  );

  const signedPayoutJson = readCandidate(options.signedPayout);
  const rewardTxJson = readCandidate(options.reward);

  const [
    { dataSource },
    { DatabaseAction },
    { TokenHandler },
    { default: MinimumFeeHandler },
    { default: ChainHandler },
    { createZcashGuardRuntime },
    { ZcashObservedSigningRecovery },
    {
      createCanonicalZcashSpentRewardOrderSource,
      createErgoNodeSelectedChainSource,
      createZcashSpentRewardChain,
    },
    { decodeZcashSettlementReceipt },
    { ErgoChain },
    { default: ErgoNodeNetwork },
  ] = await Promise.all([
    import('../db/dataSource'),
    import('../db/databaseAction'),
    import('../handlers/tokenHandler'),
    import('../handlers/minimumFeeHandler'),
    import('../handlers/chainHandler'),
    import('../handlers/zcashHandler'),
    import('../transaction/zcashObservedSigningRecovery'),
    import('../transaction/zcashSpentEventRecoveryAuthority'),
    import('../transaction/zcashConfirmationAuthority'),
    import('@rosen-chains/ergo'),
    import('@rosen-chains/ergo-node-network'),
  ]);
  if (!samePath(canonical(String(dataSource.options.database)), database))
    refuse('data source path mismatch');

  let originalGetInstance: PropertyDescriptor | undefined;
  try {
    await dataSource.initialize();
    DatabaseAction.init(dataSource);
    await TokenHandler.init(Configs.tokensPath);
    const tokens = TokenHandler.getInstance().getTokenMap();
    await MinimumFeeHandler.init(tokens);
    const zcashConfig =
      GuardsZcashConfigs.read() ?? refuse('Zcash is disabled');
    const zcashRuntime = createZcashGuardRuntime(zcashConfig, tokens);
    await zcashRuntime.chain.getHeight();
    const broadcast = zcashRuntime.getBroadcastCapability();
    const readOnlyZcash = Object.freeze({
      policy: broadcast.policy,
      validate: broadcast.validate,
      observe: broadcast.observe,
    });

    const logger = DefaultLogger.getInstance().child('zcash-recovery');
    const ergoNetwork = new ErgoNodeNetwork({
      nodeBaseUrl: GuardsErgoConfigs.node.url,
      logger,
    });
    await ergoNetwork.getHeight();
    const inertSigner = Object.freeze({
      isInSign: async () => false,
      sign: async (): Promise<never> => refuse('signing is forbidden'),
    });
    const ergoChain = new ErgoChain(
      ergoNetwork,
      GuardsErgoConfigs.chainConfigs,
      tokens,
      inertSigner,
      logger,
    );
    const readOnlyChains = Object.freeze({
      getErgoChain: () => ergoChain,
      getChain: (chain: string) => {
        if (chain === 'ergo') return ergoChain;
        if (chain === 'zcash') return zcashRuntime.chain;
        return refuse('unexpected chain');
      },
    });
    originalGetInstance = Object.getOwnPropertyDescriptor(
      ChainHandler,
      'getInstance',
    );
    if (!originalGetInstance) refuse('chain handler cannot be isolated');
    Object.defineProperty(ChainHandler, 'getInstance', {
      ...originalGetInstance,
      value: () => readOnlyChains,
    });

    const recovery = new ZcashObservedSigningRecovery(
      dataSource,
      readOnlyZcash,
      createZcashSpentRewardChain(
        ergoChain,
        createErgoNodeSelectedChainSource(GuardsErgoConfigs.node.url),
      ),
      createCanonicalZcashSpentRewardOrderSource(dataSource),
    );
    await assertGuardApiStopped(Configs.apiHost, Configs.apiPort);
    assertNoSidecars(backup);
    if (sha256File(backup) !== actualBackupSha256)
      refuse('backup changed before recovery');
    assertMatchingBackup(database, backup, options.txId);
    const result = await recovery.recover(
      options.txId,
      signedPayoutJson,
      rewardTxJson,
    );
    const receipt = decodeZcashSettlementReceipt(result.settlementJson!);
    const context = JSON.parse(receipt.eventContextJson) as {
      spentReward?: { txId?: string };
    };
    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        txId: result.txId,
        eventId: result.eventId,
        attemptId: result.attemptId,
        status: result.status,
        rewardTxId: context.spentReward?.txId,
        zcashConfirmations: receipt.confirmations,
        requiredConfirmations: receipt.requiredConfirmations,
        backupSha256: actualBackupSha256,
      })}\n`,
    );
  } finally {
    if (originalGetInstance)
      Object.defineProperty(ChainHandler, 'getInstance', originalGetInstance);
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Zcash recovery failed'}\n`,
  );
  process.exitCode = 1;
});
