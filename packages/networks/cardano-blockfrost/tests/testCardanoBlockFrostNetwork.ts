import CardanoBlockFrostNetwork from '../lib/cardanoBlockFrostNetwork';

export class TestCardanoBlockFrostNetwork extends CardanoBlockFrostNetwork {
  getClient = () => this.client;
}
