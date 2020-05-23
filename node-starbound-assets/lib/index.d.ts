declare module 'node-starbound-assets' {
  interface Callback<T> {
    (err: any, result: T): void;
  }

  export class PackedAssets {
    metadata(): Record<string, any>;
    assets(): string[];
    getFile(path: string, cb: Callback<ArrayBuffer>);
    getFileAsync(path: string): Promise<ArrayBuffer>;
  }

  export interface Player {
    contents: VersionedJSON;
  }

  export interface VersionedJSON<T = any> {
    identifier: string;
    version: number;
    content: T;
  }

  export function parsePlayer(path: string, cb: Callback<Player>);
  export function parsePlayerAsync(path: string): Promise<Player>;
  export function parseAssets(path: string, cb: Callback<PackedAssets>);
  export function parseAssetsAsync(path: string): Promise<PackedAssets>;
}
