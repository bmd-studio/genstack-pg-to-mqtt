import { connectDatabase, disconnectDatabase } from './database';
import { connectMqtt, disconnectMqtt } from './mqtt';
import { startListening } from './listener';
import { startServer, shutdownServer } from './server';
import environment from './environment';
import logger from './logger';
import { ProcessOptions } from './index';

const {
  NODE_ENV,
} = environment.env;

// reboot this service
export const reboot = (): void => {
  logger.info(`Rebooting service...`);

  // don't exit when in test environment,
  if (NODE_ENV !== 'test') {
    process.exit(1);
  }
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const startProcess = async (options?: ProcessOptions): Promise<void> => {
  await connectMqtt();
  await connectDatabase();
  await startListening();
  await startServer(options?.serverOptions);
};

export const stopProcess = async (): Promise<void> => {
  await shutdownServer();
  await disconnectDatabase();
  await disconnectMqtt();
};
