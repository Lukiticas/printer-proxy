export interface ZebraDevice {
  deviceType: 'printer';
  uid: string;
  name: string;
  connection: string;
  manufacturer?: string;
  provider?: string;
  version?: number;
}

export interface PrinterStatus {
  online: boolean;
  message: string;
  raw?: string;
  error?: Error;
}

export interface WriteResult {
  success: boolean;
  message: string;
  response?: string;
  error?: Error;
}

export interface ReadResult {
  success: boolean;
  data?: string;
  message?: string;
  error?: Error;
}