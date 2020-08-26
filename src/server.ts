import { Server } from 'http';
import express, { Express } from 'express';
import environment from './environment';
import logger from './logger';

const {
  HEALTHCHECK_PATH,
  DEFAULT_HTTP_PORT,
} = environment.env;

// install healthcheck server
const app = express();
let server: Server;

export const getApp = (): Express => {
  return app;
};

export const getServer = (): Server => {
  return server;
};

export const startServer = async (): Promise<void> => {
  app.get(HEALTHCHECK_PATH, function (_req, res) {
    res.json({ status: true });
  });
   
  return new Promise((resolve) => {
    server = app.listen(DEFAULT_HTTP_PORT, () => {
      logger.info(`Healthcheck server is now running and listening on http://localhost:${DEFAULT_HTTP_PORT}${HEALTHCHECK_PATH}...`);
      resolve();
    });
  });
};

export const shutdownServer = (): void => {
  server.close();
};