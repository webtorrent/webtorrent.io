const path = require('path')

/**
 * Is site running in production?
 */
exports.isProd = process.env.NODE_ENV === 'production'

/**
 * WebTorrent Desktop version (used by auto-updater, landing page, etc.)
 */
exports.desktopVersion = '0.24.0'

/**
 * Path to store log files
 */
exports.logPath = process.env.NODE_ENV === 'production'
  ? '/home/feross/www/log/webtorrent.io'
  : path.join(__dirname, 'logs')

let secret
try { secret = require('./secret') } catch (err) {}

/**
 * Discord IRC bot credentials
 */
exports.discordIrc = {
  nickname: 'irc-discord-bot',
  server: 'irc.freenode.net',
  discordToken: secret && secret.discordIrc && secret.discordIrc.botToken,
  channelMapping: {
    '612697220470276119': '#webtorrent',
    '612704110008991786': '#standard'
  },
  ircOptions: {
    username: 'irc-discord-bot',
    password: secret && secret.discordIrc && secret.discordIrc.ircPassword
  }
}

/**
 * Gitter IRC bot credentials
 */
exports.gitterBot = {
  ircChannel: '#webtorrent',
  ircNick: 'gitter-bot',
  ircServer: 'irc.freenode.net',
  ircOpts: {
    password: secret && secret.gitterIrc && secret.gitterIrc.ircPassword
  },
  gitterRoom: 'webtorrent/webtorrent',
  gitterApiKey: secret && secret.gitterIrc && secret.gitterIrc.gitterApiKey
}
