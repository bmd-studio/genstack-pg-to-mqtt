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

export { startProcess, stopProcess } from './process';
