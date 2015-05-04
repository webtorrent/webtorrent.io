var config = require('../config')
var debug = require('debug')('webtorrent-website:tracker')
var util = require('../util')

var Tracker = require('bittorrent-tracker/server')

util.upgradeLimits()

var tracker = new Tracker({
  ws: true // enable websocket (webtorrent) tracker
})

tracker.on('listening', function () {
  var ports = {
    http: tracker.http.address().port,
    udp: tracker.udp.address().port
  }
  debug('listening on ' + JSON.stringify(ports))
  util.downgradeUid()
  process.send('ready')
})

tracker.on('warning', function (err) {
  debug('warning: %s', err.message || err)
})

tracker.on('error', function (err) {
  console.error(err.stack || err.message || err)
})

tracker.listen(config.ports.tracker)
