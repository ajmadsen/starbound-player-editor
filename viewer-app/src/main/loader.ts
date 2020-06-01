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

if (module.hot) {
  module.hot.accept();
}

interface ResourceResponse {
  path: string;
  contents: ArrayBuffer;
}

const userHome = process.cwd() || process.env.HOME || process.env.USERPROFILE;

class Communicator {
  protected resources?: PackedAssets;
  protected player?: Player;

  constructor() {
    ipcMain.handle('get-resource', this.getResource.bind(this));
  }

  loadPlayer(player: Player, resources: PackedAssets): void {
    this.resources = resources;
    this.player = player;
  }

  protected async getResource(
    _event: IpcMainInvokeEvent,
    ...[path]: string[]
  ): Promise<ResourceResponse> {
    if (!this.resources)
      throw new Error('resources not available until a player is loaded');
    const file = await this.resources.getFileAsync(path);
    return {
      path,
      contents: file,
    };
  }
}

const communicator = new Communicator();

export async function openPlayer(
  _menuItem: MenuItem,
  browserWindow: BrowserWindow,
  _event: KeyboardEvent
): Promise<void> {
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
  communicator.loadPlayer(player, resources);

  console.log('sending event');
  browserWindow.webContents.send('message', {
    name: 'player-selected',
    payload: { player },
  });
}
