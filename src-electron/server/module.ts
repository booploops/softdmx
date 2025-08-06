import { http_server } from ".";

export class APIRoute {
  server: typeof http_server = http_server;

  async defineRoutes() {}
}
