import pg from 'pg';
import pgIpc from 'pg-ipc';

import environment from './environment';
import { reboot } from './process';
import logger from './logger';
import { PostgresOptions } from './index';

let pgClient: pg.Client;
let pgListener: any;

export const getPgClient = (): pg.Client => {
  return pgClient;
};

export const getPgListener = (): any => {
  return pgListener;
};

export const connectDatabase = async (options?: PostgresOptions): Promise<void> => {
  // include the constants here to allow test environments to change it before connecting
  const {
    APP_PREFIX,
    POSTGRES_HOST_NAME,
    POSTGRES_PORT,
    POSTGRES_DATABASE_NAME,
    POSTGRES_ADMIN_ROLE_NAME,
    POSTGRES_ADMIN_SECRET,
  } = environment.env;
  const {
    host = POSTGRES_HOST_NAME, port = POSTGRES_PORT,
    user = POSTGRES_ADMIN_ROLE_NAME, password = POSTGRES_ADMIN_SECRET,
    database = POSTGRES_DATABASE_NAME,
  } = options ?? {};
  const prefixedUser = `${APP_PREFIX}_${user}`;

  logger.info(`Connecting to the database on ${host}:${port} with user ${prefixedUser} and database ${database}`);

  // initialize Postgres client
  pgClient = new pg.Client({
    host,
    port: parseInt(String(port)),
    database,
    user: prefixedUser,
    password,
  });

  // handle Postgres errors
  pgClient.on('error', (error) => {
    logger.error('An error occurred with the database connection:');
    logger.error(error);
    reboot();
  });

  // initialize Postgres listener
  pgListener = pgIpc(pgClient);

  return new Promise((resolve, reject) => {
    pgClient.connect((error: any) => {

      // guard: check for connection error
      if (error) {
        logger.error(`An error occurred when connecting to the database...`);
        logger.error(error);
        reboot();
        return;
      }

      // handle Postgres listener errors
      pgListener.on('error', (error: Error) => {
        logger.error(`An error occurred when listening to the database for notifications:`);
        logger.error(error);
        reboot();
      });

      logger.info(`Successfully connected to the database!`);
      resolve();
    });
  });
};

export const disconnectDatabase = async (): Promise<void> => {
  logger.info(`Disconnecting the database...`);
  await pgListener.end();
  await pgClient.end();
};
