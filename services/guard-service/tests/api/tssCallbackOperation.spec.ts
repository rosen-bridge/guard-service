import { FastifyWithZod, makeFastify } from '@rosen-bridge/fastify-enhanced';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { tssRoute } from '../../src/api/tss';
import TssHandler from '../../src/handlers/tssHandler';

describe('TSS callback operation ID', () => {
  let server: FastifyWithZod;
  const handleSignData = vi.fn().mockResolvedValue(undefined);
  const body = { status: 'success', message: 'ab'.repeat(32) };

  beforeEach(async () => {
    handleSignData.mockClear();
    vi.spyOn(TssHandler, 'getTssApiKey').mockReturnValue('test-key');
    vi.spyOn(TssHandler, 'getInstance').mockReturnValue({
      handleSignData,
    } as unknown as TssHandler);
    server = await makeFastify();
    await server.register(tssRoute);
  });

  afterEach(async () => {
    await server.close();
    vi.restoreAllMocks();
  });

  it('passes a bound callback ID through the authenticated route', async () => {
    const operationId = '123e4567-e89b-42d3-a456-426614174000';
    const response = await server.inject({
      method: 'POST',
      url: `/tss/sign/ecdsa?boundOperationId=${operationId}`,
      headers: { 'api-key': 'test-key' },
      payload: body,
    });
    expect(response.statusCode).toBe(200);
    expect(handleSignData).toHaveBeenCalledWith(
      'ecdsa',
      'success',
      undefined,
      body.message,
      undefined,
      undefined,
      operationId,
    );
  });

  it('keeps a legacy callback without an operation ID', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/tss/sign/ecdsa',
      headers: { 'api-key': 'test-key' },
      payload: body,
    });
    expect(response.statusCode).toBe(200);
    expect(handleSignData).toHaveBeenCalledWith(
      'ecdsa',
      'success',
      undefined,
      body.message,
      undefined,
      undefined,
      undefined,
    );
  });

  it('rejects a malformed callback ID before dispatch', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/tss/sign/ecdsa?boundOperationId=invalid',
      headers: { 'api-key': 'test-key' },
      payload: body,
    });
    expect(response.statusCode).toBe(400);
    expect(handleSignData).not.toHaveBeenCalled();
  });
});
