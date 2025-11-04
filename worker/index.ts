import app from './app';
import { type CloudFlareEnv } from './types';

export default {
  async fetch(request: Request, env: CloudFlareEnv, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<CloudFlareEnv>;