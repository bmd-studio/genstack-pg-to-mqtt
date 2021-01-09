import { startProcess, stopProcess } from './process';

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

process.on('SIGINT', () => {
  stopProcess();
});

(async(): Promise<void> => {
  startProcess();
})();


