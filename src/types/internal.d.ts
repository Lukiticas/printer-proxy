import { PrinterDetails } from '@grandchef/node-printer';
import pkg from '../../package.json';

export type DeviceConnectionType = 'USB' | 'Network' | 'System' | 'Driver' | 'Unknown';

export interface DiscoveredPrinter {
  name: string;
  connection: DeviceConnectionType;
  isDefault?: boolean;
  manufacturer?: string;
  origin: typeof pkg.name;
  uid?: string;
  status?: string;
  lastSeen?: number;
}

export interface NormalizedPrinterDetails extends PrinterDetails {
  name: string;
  shareName?: string;
  portName: string;
  driverName: string;
  printProcessor: string;
  datatype: string;
  parameters: string;
  status: any[];
  statusNumber: number;
  attributes: string[];
  priority: number;
  defaultPriority: number;
  averagePPM: number;
}

export interface BasicPrinterStatus {
  online?: boolean;
  message?: string;
  raw?: string;
}

export interface StoredDefaultPrinter {
  name: string;
  savedAt: string;
  pinned: boolean;
  meta?: {
    lastSeenAtSave?: number;
  };
}

export interface LoadedDefault {
  record: StoredDefaultPrinter | null;
  stale: boolean;
  reason?: string;
}

export interface AvailablePrintersResponse {
  printers: DiscoveredPrinter[];
  timestamp: string;
}

export interface DefaultPrinterResponse {
  printer: DiscoveredPrinter | undefined;
  timestamp: string;
}

export interface SetDefaultPrinterRequest {
  name: string;
  pinned?: boolean;
}

export interface SetDefaultPrinterResponse {
  success: boolean;
  saved?: DiscoveredPrinter;
  error?: string;
  timestamp: string;
}

export interface PrinterJobRequestBody {
  printer?: string;
  data: string;
}

export interface PrinterJobResponseBody {
  success: boolean;
  jobId?: string;
  printer?: string;
  message?: string;
  timestamp: string;
  error?: string;
}

export interface HealthResponse {
  status: 'running' | 'error';
  uptimeSeconds: number;
  timestamp: string;
  version?: string;
  error?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  timestamp: string;
}