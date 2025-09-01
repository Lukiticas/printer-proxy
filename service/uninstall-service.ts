let Service: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Service = require('node-windows').Service;
} catch {
  console.error('node-windows not available on this platform.');
  process.exit(1);
}

const svc = new Service({
  name: 'Elgin Printer Proxy',
  script: ''
});

svc.on('uninstall', () => {
  console.log('Service uninstalled');
});

svc.uninstall();