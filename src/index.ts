export interface PgEvent {
  processId: string;
  payload: RowOperationPayload;
}

export interface RowOperationPayload {
  operation: string;
  tableName: string;
  rowId: string;
  columnName: string;
  columnValue: string;
  notifyId: string;
}

export interface ProcessOptions {
  serverOptions?: ServerOptions;
  postgresOptions?: PostgresOptions;
  mqttOptions?: MqttOptions;
}

export interface ServerOptions {
  port?: number;
  path?: string;
  healthcheckPath?: string;
}

export interface PostgresOptions {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

export interface MqttOptions {
  host?: string;
  port?: string;
  username?: string;
  password?: string;
}

export { startProcess, stopProcess } from './process';
