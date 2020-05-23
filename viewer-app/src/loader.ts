import {
  parseAssetsAsync,
  parsePlayerAsync,
  Player,
  PackedAssets,
} from 'node-starbound-assets';
import {
  dialog,
  MenuItem,
  BrowserWindow,
  KeyboardEvent,
  ipcMain,
  IpcMainInvokeEvent,
} from 'electron';
import path from 'path';

const userHome = process.cwd() || process.env.HOME || process.env.USERPROFILE;

let communicator: Communicator | null = null;

export async function openPlayer(
  _menuItem: MenuItem,
  browserWindow: BrowserWindow,
  event: KeyboardEvent
) {
  const options = await dialog.showOpenDialog({
    title: 'Select Player',
    defaultPath: userHome,
    filters: [{ extensions: ['player'], name: 'Starbound Character' }],
  });

  if (options.canceled) return;

  const [playerPath] = options.filePaths;
  const player = await parsePlayerAsync(playerPath);

  const packedPath = path.resolve(playerPath, '../packed.pak');
  const resources = await parseAssetsAsync(packedPath);

  if (communicator) {
    communicator.cancel();
  }
  communicator = new Communicator(player, resources, browserWindow);

  console.log('sending event');
  browserWindow.webContents.send('message', {
    name: 'player-selected',
    payload: { player },
  });
}

ipcMain.on('asdf', () => console.log('got asdf'));

class Communicator {
  constructor(
    protected player: Player,
    protected resources: PackedAssets,
    protected browserWindow: BrowserWindow
  ) {
    this.getResource = this.getResource.bind(this);

    ipcMain.handle('get-resource', this.getResource);
  }

  protected async getResource(event: IpcMainInvokeEvent, ...args: any[]) {
    const { path } = args[0];
    const file = await this.resources.getFileAsync(path);
    return {
      path,
      contents: file,
    };
  }

  cancel() {
    ipcMain.removeHandler('get-resource');
  }
}
