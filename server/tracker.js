var config = require('../config')
var debug = require('debug')('webtorrent-www:tracker')
var downgrade = require('downgrade')
var Tracker = require('bittorrent-tracker/server')
var unlimited = require('unlimited')

unlimited()

var tracker = new Tracker({
  ws: true, // enable websocket (webtorrent) tracker,
  udp: true
})

// Redirect http://tracker.webtorrent.io to website homepage
var onHttpRequest = tracker.onHttpRequest
tracker.onHttpRequest = function (req, res, opts) {
  if (req.url === '/') {
    res.writeHead(301, { 'Location': 'https://webtorrent.io' })
    res.end()
  } else {
    onHttpRequest.call(tracker, req, res, opts)
  }
}

tracker.on('listening', function () {
  var ports = {
    http: tracker.http.address().port,
    udp: tracker.udp.address().port
  }
  debug('listening on ' + JSON.stringify(ports))
  downgrade()
  process.send('ready')
})

tracker.on('warning', function (err) {
  debug('warning: %s', err.message || err)
})

tracker.on('error', function (err) {
  console.error(err.stack || err.message || err)
})

tracker.listen(config.ports.tracker, { http: '127.0.0.1', udp: config.host })
