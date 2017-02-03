const path = require('path')

const isProd = process.env.NODE_ENV === 'production'

/**
 * Is site running in production?
 */
exports.isProd = isProd

/**
 * WebTorrent Desktop version (used by auto-updater, landing page, etc.)
 */
exports.desktopVersion = '0.17.2'

/**
 * Server listening port
 */
exports.port = isProd
  ? 9000
  : 4000

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
  ircNick: 'irc-gitter-bot',
  ircServer: 'irc.freenode.net',
  gitterRoom: 'feross/webtorrent',
  gitterApiKey: secret && secret.gitterApiKey
}
