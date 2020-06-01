/* eslint-disable @typescript-eslint/no-var-requires */
const pnpapi = require('pnpapi');
const util = require('util');

const pkgName = require(__dirname + '/../package.json').name;
const pkgRoot = pnpapi
  .getDependencyTreeRoots()
  .filter((rt) => rt.name === pkgName)[0];

const deps = {
  dir: pnpapi.getPackageInformation(pnpapi.topLevel).packageLocation,
  deps: [],
};

const seen = new Set();
const walkTree = (locator) => {
  const key = `${locator.name}\`${locator.reference}`;
  if (seen.has(key)) return;
  seen.add(key);

  const pkgInfo = pnpapi.getPackageInformation(locator);
  if (!pkgInfo) {
    console.warn(
      `Could not find package information for: ${util.inspect(locator)}`
    );
    return;
  }

  const thisDep = pkgInfo.packageDependencies.get(locator.name);

  deps.deps.push({
    name: locator.name,
    path: pkgInfo.packageLocation,
    version: thisDep,
  });

  for (const [key, value] of pkgInfo.packageDependencies.entries()) {
    if (key === locator.name) continue;
    walkTree({ name: key, reference: value });
  }
};

walkTree(pkgRoot);

console.dir(JSON.stringify(deps));
