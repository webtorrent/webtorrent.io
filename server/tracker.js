var auth = require('basic-auth')
var config = require('../config')
var debug = require('debug')('webtorrent-www:tracker')
var downgrade = require('downgrade')
var secret = require('../secret')
var Tracker = require('bittorrent-tracker/server')
var unlimited = require('unlimited')

unlimited()

// Create WebTorrent-only tracker. Disable UDP and HTTP.
var tracker = new Tracker({ ws: true, udp: false, http: false })

// Redirect https://tracker.webtorrent.io to website homepage
tracker.http.on('request', function (req, res, opts) {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(301, { 'Location': 'https://webtorrent.io' })
    res.end()
  } else if (req.method === 'GET' && req.url === '/debug') {
    var credentials = auth(req)
    if (!credentials ||
      credentials.user !== secret.debugCredentials.user ||
      credentials.pass !== secret.debugCredentials.pass) {
      res.statusCode = 401
      res.setHeader('WWW-Authenticate', 'Basic realm="debug"')
      res.end('404 Not Found')
    }

    var infoHashes = Object.keys(tracker.torrents)

    var list = []
    infoHashes.forEach(function (infoHash) {
      var peerIds = Object.keys(tracker.torrents[infoHash].peers)
      var numPeers = 0
      peerIds.forEach(function (peerId) {
        if (tracker.torrents[infoHash].peers[peerId] !== null) numPeers += 1
      })
      if (numPeers === 0) return
      list.push('<a target="_blank" href="https://instant.io/#' + infoHash + '">' + infoHash + '</a>')
    })

    var html = '<h1>' + infoHashes.length + ' torrents (' + list.length + ' active)</h1>\n'
    html += list.join('\n<br>')

    res.end(html)
  }
})

tracker.on('listening', function () {
  debug('listening on %s', tracker.ws.address().port)
  downgrade()
  process.send('ready')
})

tracker.on('warning', function (err) {
  debug('warning: %s', err.message || err)
})

tracker.on('error', function (err) {
  console.error(err.stack || err.message || err)
})

tracker.listen(config.ports.tracker, '127.0.0.1')
