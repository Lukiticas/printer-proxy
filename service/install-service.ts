import path from 'path';

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
  description: 'HTTP proxy service for Elgin thermal printers',
  script: path.join(__dirname, '..', 'dist', 'server.js'),
  nodeOptions: ['--max_old_space_size=512']
});

svc.on('install', () => {
  console.log('Service installed');
  svc.start();
});

svc.on('alreadyinstalled', () => console.log('Service already installed'));
svc.on('start', () => console.log('Service started'));
svc.on('error', (err: any) => console.error('Service error:', err));

svc.install();