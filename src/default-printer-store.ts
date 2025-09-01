import fs from 'fs';
import path from 'path';
import { LoadedDefault, StoredDefaultPrinter } from '../types';

export class DefaultPrinterStore {
  private filePath: string;

  constructor(customPath?: string) {
    const resolved =
      customPath ||
      process.env.PRINTER_STORE_PATH ||
      path.join(process.cwd(), 'data', 'default-printer.json');

    this.filePath = resolved;
  }

  ensureDir(): void {
    const dir = path.dirname(this.filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  load(): LoadedDefault {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const record: StoredDefaultPrinter = JSON.parse(raw);

      if (!record.name) {
        return {
          record: null,
          stale: false,
          reason: 'Missing name'
        };
      }

      return { record, stale: false };
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        return {
          record: null,
          stale: false,
          reason: 'No file'
        };
      }

      return {
        record: null,
        stale: true,
        reason: 'Corrupt file'
      };
    }
  }

  save(record: StoredDefaultPrinter): void {
    this.ensureDir();

    const tmp = this.filePath + '.tmp';

    fs.writeFileSync(tmp, JSON.stringify(record, null, 2), 'utf8');
    fs.renameSync(tmp, this.filePath);

    try {
      fs.chmodSync(this.filePath, 0o600);
    } catch {
      /* ignore on non-POSIX FS */
    }
  }

  clear(): void {
    try {
      fs.unlinkSync(this.filePath);
    } catch {
      /* ignore */
    }
  }
}