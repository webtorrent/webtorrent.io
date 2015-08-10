var fs = require('fs')
var path = require('path')
var TorrentGraph = require('../lib/torrent-graph')
var WebTorrent = require('webtorrent')

var WANDERERS_TORRENT = fs.readFileSync(path.join(__dirname, '../wanderers.torrent'))

module.exports = function () {
  var t = window.t = new TorrentGraph('#svgWrap')
  t.add({ id: 'You', me: true })

  var client = window.client = new WebTorrent()
  client.add(WANDERERS_TORRENT, onTorrent)

  function onTorrent (torrent) {
    torrent.files[0].appendTo('#videoWrap', function (err, elem) {
      if (err) return window.alert(err)
    })

    torrent.on('wire', function (wire) {
      var id = wire.peerId.toString()
      t.add({ id: id, ip: wire.remoteAddress || 'Unknown' })
      t.connect('You', id)
      wire.on('close', function () {
        t.disconnect('You', id)
        t.remove(id)
      })
    })
  }
}
