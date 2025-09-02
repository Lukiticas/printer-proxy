import './env'
import { app, Tray, Menu, shell, nativeImage, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

let tray: Tray | null = null;
let serverHandle: any = null;

const isDevEnv = process.env.ELECTRON_DEV === '1';

async function loadServerCore() {
  if (isDevEnv) {
    return require('../src/runtime/server-core');
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../dist-runtime/src/runtime/server-core');
  }
}

function ensureDirs(userData: string) {
  const logDir = path.join(userData, 'logs');
  const dataDir = path.join(userData, 'data');

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  process.env.LOG_DIR = logDir;
  process.env.DATA_DIR = dataDir;

  return { logDir, dataDir };
}

async function startBackend() {
  const { startServer } = await loadServerCore();
  serverHandle = await startServer();
}

function buildMenu() {
  if (!tray || !serverHandle) {
    return;
  }

  const settings = serverHandle.settings;

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Settings',
      click: () => {
        shell.openExternal(`http://${settings.host}:${settings.port}/settings`);
      }
    },
    {
      label: 'Open Logs Folder',
      click: () => {
        if (process.env.LOG_DIR) shell.openPath(process.env.LOG_DIR);
      }
    },
    {
      label: 'Reload Config (.env)',
      click: async () => {
        try {
          const printers = (await serverHandle.printerManager.list())
            .map((p: any) => p.name);
          serverHandle.configService.reloadFromEnv(printers);
          dialog.showMessageBox({ message: 'Reloaded from .env (if present)', type: 'info' });
        } catch (e: any) {
          dialog.showErrorBox('Config Reload Failed', e.message || String(e));
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Restart Server',
      click: async () => {
        try {
          await serverHandle?.stop();
          await startBackend();
          buildMenu();
        } catch (e: any) {
          dialog.showErrorBox('Restart Failed', e.message || String(e));
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: async () => {
        await gracefulQuit();
      }
    }
  ]);

  tray.setContextMenu(menu);
  tray.setToolTip('Printer Proxy');
}

async function createTray() {
  const iconCandidate = path.join(process.resourcesPath, 'tray-icon.png');
  let icon = nativeImage.createEmpty();

  if (fs.existsSync(iconCandidate)) {
    icon = nativeImage.createFromPath(iconCandidate);
    icon.setTemplateImage(false);
  }

  tray = new Tray(icon);

  buildMenu();
}

async function gracefulQuit() {
  try {
    if (serverHandle?.stop) {
      await serverHandle.stop();
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error stopping server', e);
  }

  app.exit(0);
}

async function bootstrap() {
  await app.whenReady();

  const userData = app.getPath('userData');
  ensureDirs(userData);

  await startBackend();
  await createTray();

  app.setLoginItemSettings({ openAtLogin: true, enabled: true });

  app.on('before-quit', (e) => {
    e.preventDefault();
    gracefulQuit();
  });
}

bootstrap().catch(err => {
  console.error('Fatal Electron bootstrap error', err);

  try {
    app?.exit(1);
  } catch {
    process.exit(1);
  }
});