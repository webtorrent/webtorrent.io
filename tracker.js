var config = require('./config')
var debug = require('debug')('webtorrent:tracker')
var TrackerServer = require('bittorrent-tracker').Server
var util = require('./util')

util.upgradeLimits()

var tracker = new TrackerServer()
tracker.listen(config.ports.tracker)

tracker.on('listening', function (ports) {
  debug('listening on ' + JSON.stringify(ports))
  util.downgradeUid()
  process.send('ready')
})
