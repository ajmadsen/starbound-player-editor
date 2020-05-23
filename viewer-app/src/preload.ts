import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld('starboundService', {
  getResource: (name: string) => ipcRenderer.invoke('get-resource', name),
});

process.on('loaded', () => {
  ipcRenderer.on('message', (event, ...args) => {
    const [name, payload] = args;
    window.postMessage(name, '*', payload);
  });
});
