import 'source-map-support/register';
import { ipcRenderer, contextBridge } from 'electron';
import { Player } from './types/player';

console.log('preload loaded');

contextBridge.exposeInMainWorld('starboundService', {
  getResource: (name: string) => ipcRenderer.invoke('get-resource', name),
  savePlayer: (player: Player) => ipcRenderer.invoke('save-player', player),
});

process.on('loaded', () => {
  ipcRenderer.on('message', (event, ...args) => {
    const [payload, ...rest] = args;
    window.postMessage(payload, SAFE_ORIGIN, rest);
  });
});
