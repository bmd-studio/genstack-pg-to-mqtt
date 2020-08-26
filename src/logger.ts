import debug from 'debug';
import chalk from 'chalk';

const DEBUG_NAMESPACE = 'pg-to-mqtt';
const infoInstance = debug(`${DEBUG_NAMESPACE}:info`);
const errorInstance = debug(`${DEBUG_NAMESPACE}:error`);

export const info = (...args: any[]): void => {
  return infoInstance(chalk.blue('[INFO]'), ...args);
};

export const error = (...args: any[]): void => {
  return errorInstance(chalk.red('[ERROR]'), ...args);
};

export default {
  info,
  error,
};
