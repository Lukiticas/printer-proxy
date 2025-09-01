declare module '@grandchef/node-printer' {
  export interface RawPrintOptions {
    data: string | Buffer;
    printer?: string;
    type?: string;
    success?: (jobId: number | string) => void;
    error?: (err: any) => void;
  }

  export interface NodePrinterInfo {
    name: string;
    isDefault?: boolean;
    status?: string;
    port?: string;
  }

  export function printDirect(options: RawPrintOptions): void;
  export function getPrinters(
    cb: (err: Error | null, printers: NodePrinterInfo[]) => void
  ): void;
  export function getDefaultPrinterName(): string;
}