import { Server } from 'http';
import express, { Express } from 'express';

import environment from './environment';
import logger from './logger';
import { ServerOptions } from './index';

// install healthcheck server
const app = express();
let server: Server;

export const getApp = (): Express => {
  return app;
};

export const getServer = (): Server => {
  return server;
};

export const startServer = async (options?: ServerOptions): Promise<void> => {
  const {
    HEALTHCHECK_PATH,
    DEFAULT_HTTP_PORT,
  } = environment.env;
  const { port = DEFAULT_HTTP_PORT, healthcheckPath = HEALTHCHECK_PATH } = options ?? {};

  logger.info(`Starting server on port: ${port}`);
  app.get(healthcheckPath, function (_req, res) {
    res.json({ status: true });
  });

  return new Promise((resolve) => {
    server = app.listen(port, () => {
      logger.info(`Healthcheck server is now running and listening on http://localhost:${port}${healthcheckPath}...`);
      resolve();
    });
  });
};

export const shutdownServer = (): void => {
  logger.info(`Shutting down server...`);
  server.close();
};
