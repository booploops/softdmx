import { APIRoute } from "../module";

export class FilesAPI extends APIRoute {
  async defineRoutes() {
    this.server.register((instance, opts, done) => {

      done();
    }, {
      prefix: '/api/v1/files',
    })
  }
}
