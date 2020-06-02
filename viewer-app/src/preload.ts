import 'source-map-support/register';
import { ipcRenderer, contextBridge } from 'electron';

console.log('preload loaded');

contextBridge.exposeInMainWorld('starboundService', {
  getResource: (name: string) => ipcRenderer.invoke('get-resource', name),
});

process.on('loaded', () => {
  ipcRenderer.on('message', (event, ...args) => {
    const [payload, ...rest] = args;
    window.postMessage(payload, SAFE_ORIGIN, rest);
  });
});
