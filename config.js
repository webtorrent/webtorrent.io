var path = require('path')

var secret
try { secret = require('./secret') } catch (err) {}

exports.desktopVersion = '0.17.2'

exports.isProd = process.env.NODE_ENV === 'production'
exports.port = exports.isProd ? 80 : 9000

exports.gitterBot = {
  ircChannel: '#webtorrent',
  ircNick: 'irc-gitter-bot',
  ircServer: 'irc.freenode.net',
  gitterRoom: 'feross/webtorrent',
  gitterApiKey: secret && secret.gitterApiKey
}

exports.logPath = process.env.NODE_ENV === 'production'
  ? '/home/feross/www/log/webtorrent.io'
  : path.join(__dirname, 'logs')
