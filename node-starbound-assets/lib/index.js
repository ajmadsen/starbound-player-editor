var {
  parseAssets,
  parsePlayer,
  PackedAssets,
  savePlayer,
} = require('../native');
const { promisify } = require('util');

const parseAssetsAsync = promisify(parseAssets);
PackedAssets.prototype.getFileAsync = promisify(PackedAssets.prototype.getFile);

const parsePlayerAsync = promisify(parsePlayer);
const savePlayerAsync = promisify(savePlayer);

module.exports = {
  parseAssets,
  parseAssetsAsync,
  parsePlayer,
  parsePlayerAsync,
  savePlayer,
  savePlayerAsync,
};
