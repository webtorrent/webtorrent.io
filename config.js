const path = require('path')

/**
 * Is site running in production?
 */
exports.isProd = process.env.NODE_ENV === 'production'

/**
 * WebTorrent Desktop version (used by auto-updater, landing page, etc.)
 */
exports.desktopVersion = '0.20.0'

/**
 * Path to store log files
 */
exports.logPath = process.env.NODE_ENV === 'production'
  ? '/home/feross/www/log/webtorrent.io'
  : path.join(__dirname, 'logs')

let secret
try { secret = require('./secret') } catch (err) {}

/**
 * Gitter IRC bot credentials
 */
exports.gitterBot = {
  ircChannel: '#webtorrent',
  ircNick: 'gitter-bot',
  ircServer: 'irc.freenode.net',
  ircAdmin: 'feross',
  ircOpts: {
    password: secret && secret.gitterIrc && secret.gitterIrc.ircPassword
  },
  gitterRoom: 'webtorrent/webtorrent',
  gitterApiKey: secret && secret.gitterIrc && secret.gitterIrc.gitterApiKey
}
