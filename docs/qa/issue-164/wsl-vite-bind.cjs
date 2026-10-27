// Task-local WSL qualification adapter: the host rejects the loopback-specific
// bind at 4173, while wildcard binding works. Clients still use 127.0.0.1:4173.
// Opt in only for the Vite CLI; no test process, assertion or product code changes.
const { realpathSync } = require('node:fs');
const { Server } = require('node:net');
if (process.platform === 'linux' && process.env.TACTICS_WSL_VITE_BIND === '1' && process.argv[1] &&
    /[/\\](?:vite|vite\.js)$/.test(process.argv[1]) &&
    /[/\\]vite[/\\]bin[/\\]vite\.js$/.test(realpathSync(process.argv[1]))) {
  const listen = Server.prototype.listen;
  Server.prototype.listen = function (...args) {
    if (args[0] && typeof args[0] === 'object' && args[0].host === '127.0.0.1' && Number(args[0].port) === 4173)
      args[0] = { ...args[0], host: '0.0.0.0' };
    else if (Number(args[0]) === 4173 && args[1] === '127.0.0.1') args[1] = '0.0.0.0';
    return listen.apply(this, args);
  };
}
