var { parseAssets, parsePlayer, PackedAssets } = require('../native');
const { promisify } = require('util');

const parseAssetsAsync = promisify(parseAssets);
PackedAssets.prototype.getFileAsync = promisify(PackedAssets.prototype.getFile);

const parsePlayerAsync = promisify(parsePlayer);

module.exports = {
  parseAssets,
  parseAssetsAsync,
  parsePlayer,
  parsePlayerAsync,
};
