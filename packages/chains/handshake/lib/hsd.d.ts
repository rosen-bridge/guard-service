declare module 'hsd' {
  export class MTX {
    inputs: Input[];
    outputs: Output[];
    version: number;
    locktime: number;
    view: CoinView;

    constructor();
    addCoin(coin: Coin): void;
    addOutput(options: { address: Address; value: number }): void;
    txid(): string;
    hasWitness(): boolean;
    getVirtualSize(): number;
    getSize(): number;
    getBaseSize(): number;
    signatureHash(
      index: number,
      prev: Script,
      value: number,
      type: number,
    ): Buffer;
    encode(): Buffer;
    toRaw(): Buffer;
    clone(): MTX;
    static fromRaw(data: Buffer): MTX;
    static fromJSON(json): MTX;
  }

  export class TX {
    inputs: Input[];
    outputs: Output[];
    getVirtualSize(): number;
    getSize(): number;
    getBaseSize(): number;
    static fromRaw(data: Buffer): TX;
  }

  export class Input {
    prevout: Outpoint;
    witness: Witness;

    constructor();
  }

  export class Output {
    value: number;
    covenant: {
      type: number;
      action: string;
      items: string[];
    };
    getAddress(): Address | null;
  }

  export class Outpoint {
    hash: Buffer;
    index: number;
    rhash(): string;
    txid(): string;
  }

  export class Witness {
    fromStack(stack: Buffer[]): void;
  }

  export class Address {
    version: number;
    hash: Buffer;

    static fromString(address: string): Address;
    toString(): string;
    getHash(): Buffer;
  }

  export class Script {
    constructor();
    pushData(data: Buffer): void;
    pushOp(op: number): void;
    compile(): void;
    toStack(): Buffer[];
    encode(): Buffer;
    static fromRaw(data: Buffer): Script;
    static decode(data: Buffer): Script;
    static fromPubkeyhash(hash: Buffer): Script;
    static opcodes: {
      OP_0: number;
      OP_1: number;
      OP_CHECKMULTISIG: number;
      [key: string]: number;
    };
  }

  export class Coin {
    version: number;
    height: number;
    value: number;
    address: Address;
    coinbase: boolean;
    hash: Buffer;
    index: number;

    static fromJSON(options: {
      version: number;
      height: number;
      value: number;
      address: string;
      coinbase: boolean;
      hash: string;
      index: number;
    }): Coin;
  }

  export class CoinView {
    addCoin(coin: Coin): void;
  }

  const hsd: {
    MTX: typeof MTX;
    TX: typeof TX;
    Input: typeof Input;
    Output: typeof Output;
    Outpoint: typeof Outpoint;
    Witness: typeof Witness;
    Address: typeof Address;
    Script: typeof Script;
    Coin: typeof Coin;
    CoinView: typeof CoinView;
  };

  export default hsd;
}
