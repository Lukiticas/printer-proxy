export interface SecurityConfig {
  mode: 'allowAll';
  whitelist: string[];
  blacklist: string[];
  promptMode?: 'popup'; 
  trustLoopback?: boolean;
  includePortInHostKey?: boolean;
}

export interface UIConfig {
  lastOpened?: string;
}

export interface SettingsData {
  schemaVersion: 1;
  host: string;
  port: number;
  defaultPrinter?: string;
  security: SecurityConfig;
  ui: UIConfig;
}

export interface SettingsRuntimeInfo {
  staleDefaultPrinter: boolean;
  availablePrinters: string[];
  restartRequired: string[];
  schemaVersion: number;
}

export interface validateSettingsOutput {
  valid: boolean;
  errors: string[];
  value?: SettingsData;
}

export interface applyPartialOutput {
  updated: SettingsData;
  changedKeys: string[];
  restartRequired: string[];
}

export type PartialSettingsInput = Partial<Pick<SettingsData,
  'host' | 'port' | 'defaultPrinter'
>>;