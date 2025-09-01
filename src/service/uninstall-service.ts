import { loggers } from "../logging/logger";

let Service: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Service = require('node-windows').Service;
} catch (err: any) {
  loggers.main.error('NodeWindowsNotAvailable', { error: err.message });
  process.exit(1);
}

const svc = new Service({
  name: 'Elgin Printer Proxy',
  script: ''
});

svc.on('uninstall', () => {
  loggers.main.info('ServiceUninstalled', { name: svc.name });
});

svc.uninstall();