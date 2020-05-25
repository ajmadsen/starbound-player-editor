import { app, BrowserWindow, Menu } from 'electron';
import { openPlayer } from './loader';
import path from 'path';
import { format as formatUrl } from 'url';

declare const PRELOAD_SCRIPT: any;

if (module.hot) {
  module.hot.accept();
}

const isDevelopment = process.env.NODE_ENV !== 'production';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

Menu.setApplicationMenu(
  Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'Open', click: openPlayer },
        { type: 'separator' },
        { label: 'Exit', role: 'quit' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Force Reload',
          role: 'forceReload',
        },
      ],
    },
  ])
);

const createWindow = () => {
  const entry = (fileName: string): string =>
    isDevelopment
      ? `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}/${fileName}`
      : formatUrl({
          protocol: 'file',
          slashes: true,
          pathname: path.join(__dirname, '..', fileName),
        });

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
      preload: PRELOAD_SCRIPT,
    },
  });

  // if (isDevelopment) {
  mainWindow.webContents.openDevTools();
  // }

  // and load the index.html of the app.
  mainWindow.loadURL(entry('renderer/index.html'));

  // Open the DevTools.
  mainWindow.webContents.on('devtools-opened', () => {
    mainWindow.focus();
    setImmediate(() => {
      mainWindow.focus();
    });
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
