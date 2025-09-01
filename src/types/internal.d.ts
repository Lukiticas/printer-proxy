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
  printer: DiscoveredPrinter | null;
  timestamp: string;
}

export interface SetDefaultPrinterRequest {
  name: string;
  pinned?: boolean;
}

export interface SetDefaultPrinterResponse {
  success: boolean;
  saved?: {
    name: string;
    pinned: boolean;
    savedAt: string;
  };
  error?: string;
  timestamp: string;
}

export interface WriteRequestBody {
  printer?: string;
  data: string;
}

export interface WriteResponseBody {
  success: boolean;
  jobId?: string;
  printer?: string;
  message?: string;
  timestamp: string;
  error?: string;
}

export interface ReadRequestBody {
  printer?: string;
  command?: string;
}

export interface ReadResponseBody {
  success: boolean;
  printer?: string;
  command?: string;
  status?: BasicPrinterStatus;
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