import {
  parseAssetsAsync,
  parsePlayerAsync,
  savePlayerAsync,
  Player,
  PackedAssets,
} from 'node-starbound-assets';
import {
  dialog,
  MenuItem,
  BrowserWindow,
  ipcMain,
  IpcMainInvokeEvent,
} from 'electron';
import path from 'path';
import { promises as fs } from 'fs';

import { Player as PlayerData } from '../types/player';

interface ResourceResponse {
  path: string;
  contents: ArrayBuffer;
}

const userHome = process.cwd() || process.env.HOME || process.env.USERPROFILE;

class Communicator {
  protected resources?: PackedAssets;
  protected player?: Player;
  protected playerPath?: string;

  constructor(communicator?: Communicator) {
    if (communicator) {
      communicator.detach();
      this.resources = communicator.resources;
      this.player = communicator.player;
      this.playerPath = communicator.playerPath;
    }

    ipcMain.handle('get-resource', this.getResource.bind(this));
    ipcMain.handle('save-player', this.savePlayer.bind(this));
  }

  detach(): void {
    ipcMain.removeHandler('get-resource');
    ipcMain.removeHandler('save-player');
  }

  loadPlayer(
    playerPath: string,
    player: Player,
    resources: PackedAssets
  ): void {
    this.resources = resources;
    this.player = player;
    this.playerPath = playerPath;
  }

  protected async savePlayer(
    _event: IpcMainInvokeEvent,
    ...[player]: PlayerData[]
  ): Promise<void> {
    if (!this.player || !this.playerPath)
      throw new Error('invalid state: need to load a player first');

    this.player.contents.content = player;

    const bytes = await savePlayerAsync(this.player);
    const parsedPath = path.parse(this.playerPath);

    let highest = 0;
    for (const entry of await fs.readdir(parsedPath.dir)) {
      const [, lastBakStr] = /\.(\d+)\.player$/.exec(entry) || [];
      const lastBak = parseInt(lastBakStr);
      if (lastBak > highest) highest = lastBak;
    }

    await fs.rename(
      this.playerPath,
      path.join(parsedPath.dir, `${parsedPath.name}.${highest + 1}.player`)
    );

    await fs.writeFile(this.playerPath, new Uint8Array(bytes));
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

let communicator: Communicator | null = null;

if (module.hot) {
  module.hot.accept();
  module.hot.addDisposeHandler((data) => {
    data.communicator = communicator;
  });
  if (module.hot.data && module.hot.data.communicator) {
    communicator = new Communicator(module.hot.data.communicator);
  }
}

if (!communicator) communicator = new Communicator();

export async function openPlayer(
  _menuItem: MenuItem,
  browserWindow: BrowserWindow
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
  communicator?.loadPlayer(playerPath, player, resources);

  console.log('sending event');
  browserWindow.webContents.send('message', {
    name: 'player-selected',
    payload: { player },
  });
}

export function requestSave(
  _menuItem: MenuItem,
  browserWindow: BrowserWindow
): void {
  browserWindow.webContents.send('message', {
    name: 'save-requested',
    payload: {},
  });
}
