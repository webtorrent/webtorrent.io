var config = require('../config')
var debug = require('debug')('webtorrent-www:tracker')
var downgrade = require('downgrade')
var Tracker = require('bittorrent-tracker/server')
var unlimited = require('unlimited')

unlimited()

// Create WebTorrent-only tracker. Disable UDP and HTTP.
var tracker = new Tracker({ ws: true, udp: false, http: false })

// Redirect http://tracker.webtorrent.io to website homepage
tracker.http.on('request', function (req, res, opts) {
  if (req.url === '/') {
    res.writeHead(301, { 'Location': 'https://webtorrent.io' })
    res.end()
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

tracker.listen(config.ports.tracker)
