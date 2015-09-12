var debounce = require('debounce')
var fs = require('fs')
var moment = require('moment')
var path = require('path')
var prettyBytes = require('pretty-bytes')
var TorrentGraph = require('../lib/torrent-graph')
var WebTorrent = require('webtorrent')

var WANDERERS_TORRENT = fs.readFileSync(
  path.join(__dirname, '../../static/torrents/wanderers.torrent')
)

module.exports = function () {
  var client = window.client = new WebTorrent()
  var graph = window.graph = new TorrentGraph('#svgWrap')

  var torrent = client.add(WANDERERS_TORRENT, onTorrent)
  graph.add({ id: 'You', me: true })

  var $body = document.body
  var $progressBar = document.querySelector('#progressBar')
  var $numPeers = document.querySelector('#numPeers')
  var $downloaded = document.querySelector('#downloaded')
  var $total = document.querySelector('#total')
  var $remaining = document.querySelector('#remaining')

  function onTorrent () {
    torrent.files[0].appendTo('#videoWrap', onError)
    torrent.on('wire', onWire)
    torrent.on('download', debounce(onProgress, 500))
    torrent.on('done', onDone)
    onProgress()
  }

  function onWire (wire) {
    var id = wire.peerId.toString()
    graph.add({ id: id, ip: wire.remoteAddress || 'Unknown' })
    graph.connect('You', id)
    wire.once('close', function () {
      graph.disconnect('You', id)
      graph.remove(id)
      onProgress()
    })
    onProgress()
  }

  function onProgress () {
    var percent = Math.round(torrent.progress * 100 * 100) / 100
    $progressBar.style.width = percent + '%'
    $numPeers.innerHTML = torrent.numPeers + ' peers'

    $downloaded.innerHTML = prettyBytes(torrent.downloaded)
    $total.innerHTML = prettyBytes(torrent.length)

    var remaining
    if (torrent.done) {
      remaining = 'Done.'
    } else {
      remaining = moment.duration(torrent.timeRemaining / 1000, 'seconds').humanize()
      remaining = remaining[0].toUpperCase() + remaining.substring(1) + ' remaining.'
    }
    $remaining.innerHTML = remaining
  }

  function onDone () {
    $body.className += ' is-seed'
    onProgress()
  }

  function onError (err) {
    if (err) return window.alert(err)
  }
}
