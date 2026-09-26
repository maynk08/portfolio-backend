import type { Express } from 'express';
import type { Server } from 'node:http';

export function startServer(app: Express, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, (error?: Error) => {
      if (error !== undefined) {
        reject(error);
        return;
      }
      resolve(server);
    });
  });
}

export function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    // Stops accepting new connections; the callback fires once in-flight requests have finished.
    server.close((error) => {
      if (error !== undefined) {
        reject(error);
        return;
      }
      resolve();
    });
    server.closeIdleConnections();
  });
}
