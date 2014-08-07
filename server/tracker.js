var config = require('../config')
var debug = require('debug')('webtorrent-website:tracker')
var util = require('../util')

var BitTorrentTracker = require('bittorrent-tracker/server')
var WebTorrentTracker = require('webtorrent-tracker/server')

util.upgradeLimits()

var btTracker = new BitTorrentTracker()

// Add a websocket server at the same URL
var wtTracker = new WebTorrentTracker({ server: btTracker._httpServer })

btTracker.on('listening', function (ports) {
  debug('listening on ' + JSON.stringify(ports))
  util.downgradeUid()
  process.send('ready')
})

btTracker.listen(config.ports.tracker)
