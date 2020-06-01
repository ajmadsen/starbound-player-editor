declare module 'pnpapi' {
  namespace pnpapi {
    export type PackageLocator = {
      name: string | null;
      reference: string | null;
    };
    export type PackageInformation = {
      packageLocation: string;
      packageDependencies: Map<string, null | string | [string, string]>;
      packagePeers: Set<string>;
      linkType: 'HARD' | 'SOFT';
    };
    export const VERSIONS: { std: number; [key: string]: number };
    export const topLevel: { name: null; reference: null };
    export function getLocator(
      name: string,
      referencish: string | [string, string]
    ): PackageLocator;
    export function getDependencyTreeRoots(): PackageLocator[];
    export function getPackageInformation(
      locator: PackageLocator
    ): PackageInformation;
    export function findPackageLocator(location: string): PackageLocator | null;
    export function resolveToUnqualified(
      request: string,
      issuer: string | null,
      opts?: { considerBuiltins?: boolean }
    ): string | null;
    export function resolveUnqualified(
      unqualified: string,
      opts?: { extensions?: string[] }
    ): string;
    export function resolveRequest(
      request: string,
      issuer: string | null,
      opts?: { considerBuiltins?: boolean; extensions?: string[] }
    ): string | null;
    export function resolveVirtual(path: string): string | null;
  }

  export = pnpapi;
}
