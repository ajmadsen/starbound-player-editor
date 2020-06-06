const assets = require('./lib');

assets
  .parsePlayerAsync('../resources/c75356ebfb10a0111500b4985132688b.player')
  .then((player) => {
    assets.savePlayer(player, (err, bytes) => {
      console.log('output', err, bytes);
    });
  })
  .catch((err) => console.log('got error', err));

process.setUncaughtExceptionCaptureCallback((err) => {
  console.log('uncaught error', err);
});
