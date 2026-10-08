/**
 * Adapt a response factory to the fetch signature without making HTTP requests.
 * @param reply - Factory receiving the parsed JSON-RPC request body
 * @returns An injected fetch implementation returning the factory response
 */
export const mockFetch = (
  reply: (request: Record<string, unknown>) => Response | Promise<Response>,
) =>
  (async (_url, init) => reply(JSON.parse(String(init?.body)))) as typeof fetch;
