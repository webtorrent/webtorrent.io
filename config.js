var secret = require('./secret')

var PORT_80 = process.env.NODE_ENV === 'production' ? 80 : 9000
var PORT_443 = process.env.NODE_ENV === 'production' ? 443 : 9001

exports.host = process.env.NODE_ENV === 'production' && '23.92.26.245'

exports.ports = {
  router: {
    http: PORT_80,
    https: PORT_443
  },
  web: 9002,
  tracker: {
    http: 9003,
    udp: PORT_80
  }
}

exports.gitterBot = {
  ircChannel: '#webtorrent',
  ircNick: 'irc-gitter-bot',
  gitterRoom: 'feross/webtorrent',
  gitterApiKey: secret.gitterApiKey
}
