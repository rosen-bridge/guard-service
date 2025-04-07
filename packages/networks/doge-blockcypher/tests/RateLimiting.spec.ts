import DogeBlockcypherNetwork from '../lib/DogeBlockcypherNetwork';
import { resetAxiosMock, axiosInstance } from './mocked/axios.mock';
import { beforeEach, describe, it, expect } from 'vitest';
import axios from 'axios';

describe('DogeBlockcypherNetwork Rate Limiting', () => {
  let network: DogeBlockcypherNetwork;

  beforeEach(() => {
    resetAxiosMock();
    network = new DogeBlockcypherNetwork(
      'blockcypher-url',
      async () => undefined
    );
  });

  /**
   * Note: The actual rate limiting functionality can't be effectively unit tested
   * since we're mocking axios and the rate-limit behavior. In a real environment,
   * the rate-limit package would queue requests and release them at the appropriate
   * intervals. These tests only verify the setup of the rate limiting, not its
   * actual behavior.
   */

  /**
   * @target `DogeBlockcypherNetwork` should properly initialize with axios-rate-limit
   * @dependencies
   * @scenario
   * - verify that the network is initialized correctly
   * @expected
   * - axios.create should be called with the correct URL
   * - client should be properly initialized
   */
  it('should initialize properly', () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'blockcypher-url',
    });

    // Verify the client is an AxiosInstance
    expect(network['client']).toBeDefined();
    expect(network['client'].get).toBeDefined();
    expect(network['client'].post).toBeDefined();

    // Verify mock rate limit was correctly configured with default RPS 3
    expect(axiosInstance.getMaxRPS()).toBe(3);
  });

  /**
   * @target `DogeBlockcypherNetwork` should accept custom rate limit parameter
   * @dependencies
   * @scenario
   * - create a network with a custom RPS
   * - verify the network initializes correctly
   * @expected
   * - should initialize successfully with a custom RPS of 5
   */
  it('should accept a custom rate limit parameter', () => {
    resetAxiosMock();
    const customNetwork = new DogeBlockcypherNetwork(
      'blockcypher-url',
      async () => undefined,
      undefined,
      5 // custom RPS of 5
    );

    // Verify the network was created successfully
    expect(customNetwork).toBeInstanceOf(DogeBlockcypherNetwork);
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'blockcypher-url',
    });

    // Verify mock rate limit was correctly configured with custom RPS 5
    expect(axiosInstance.getMaxRPS()).toBe(5);
  });
});
