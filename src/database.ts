import pg from 'pg';
import pgIpc from 'pg-ipc';

import environment from './environment';
import { reboot } from './process';
import logger from './logger';

let pgClient: pg.Client;
let pgListener: any;

export const getPgClient = (): pg.Client => {
  return pgClient;
};

export const getPgListener = (): any => {
  return pgListener;
};

export const connectDatabase = async (): Promise<void> => {
  // include the constants here to allow test environments to change it before connecting
  const {
    APP_PREFIX, 
    POSTGRES_HOST_NAME,
    POSTGRES_PORT,
    POSTGRES_DATABASE_NAME,
    POSTGRES_ADMIN_ROLE_NAME,
    POSTGRES_ADMIN_SECRET,
  } = environment.env;
    
  // initialize Postgres client
  pgClient = new pg.Client({
    host: POSTGRES_HOST_NAME,
    port: parseInt(POSTGRES_PORT),
    database: POSTGRES_DATABASE_NAME,
    user: `${APP_PREFIX}_${POSTGRES_ADMIN_ROLE_NAME}`,
    password: POSTGRES_ADMIN_SECRET,
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
        reject(error);
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
  await pgListener.end();
  await pgClient.end();
};