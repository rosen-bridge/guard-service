type RouteHandler = (request: any, reply: any) => any;

class MockFastifyServer {
  private static routes: Array<{
    method: string;
    url: string;
    handler: RouteHandler;
  }> = [];

  /**
   * resets all mock routes
   */
  static resetMock = () => {
    this.routes = [];
  };

  /**
   * registers a get route
   * @param url
   * @param options
   * @param handler
   * @returns void
   */
  static get(url: string, options: any, handler: RouteHandler) {
    this.routes.push({ method: 'GET', url, handler });
  }

  // TODO: handle other methods
  // TODO: remove body from `get` requests
  /**
   * executes the route handler
   * @param url
   * @param mockRequest
   * @param mockReply
   * @returns promise of any
   */
  static async simulateRequest(
    url: string,
    mockRequest: any = {},
    mockReply: any = {}
  ) {
    const route = this.routes.find(
      (route) => route.method === 'GET' && route.url === url
    );
    if (!route) {
      throw new Error(`Route not found for ${url}`);
    }

    return await route.handler(mockRequest, mockReply);
  }
}

export default MockFastifyServer;
