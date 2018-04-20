var fs = require('fs')
var get = require('simple-get')
var moment = require('moment')
var P2PGraph = require('p2p-graph')
var path = require('path')
var prettierBytes = require('prettier-bytes')
var throttle = require('throttleit')
var WebTorrent = require('webtorrent')

var TORRENT = fs.readFileSync(
  path.join(__dirname, '../../static/torrents/sintel.torrent')
)

module.exports = function () {
  var graph
  var hero = document.querySelector('#hero')

  // Don't start the demo automatically on mobile.
  if (window.innerWidth <= 899) {
    var beginButton = document.createElement('a')
    beginButton.href = '#'
    beginButton.id = 'begin'
    beginButton.className = 'btn large'
    beginButton.textContent = 'Begin Demo'

    beginButton.addEventListener('click', function onClick () {
      beginButton.removeEventListener('click', onClick, false)
      beginButton.parentNode.removeChild(beginButton)
      beginButton = null

      init()
    })
    hero.appendChild(beginButton)
  } else {
    init()
  }

  function init () {
    // Display video and related information.
    hero.className = 'loading'
    hero = null

    graph = window.graph = new P2PGraph('.torrent-graph')

    getRtcConfig(function (err, rtcConfig) {
      if (err) console.error(err)
      createClient(rtcConfig)
    })
  }

  var torrent
  function createClient (rtcConfig) {
    var client = window.client = new WebTorrent({
      tracker: {
        rtcConfig: rtcConfig
      }
    })
    client.on('warning', onWarning)
    client.on('error', onError)

    torrent = client.add(TORRENT, onTorrent)
    graph.add({ id: 'You', name: 'You', me: true })
  }

  var $body = document.body
  var $progressBar = document.querySelector('#progressBar')
  var $numPeers = document.querySelector('#numPeers')
  var $downloaded = document.querySelector('#downloaded')
  var $total = document.querySelector('#total')
  var $remaining = document.querySelector('#remaining')

  function onTorrent () {
    var file = torrent.files.find(function (file) {
      return file.name.endsWith('.mp4')
    })
    var opts = {
      autoplay: true,
      muted: true
    }
    file.appendTo('#videoWrap .video', opts, function (err, elem) {
      if (err) return onError(err)
      elem.parentElement.classList.add('canplay')
      elem.parentElement.classList.add('muted')

      elem.addEventListener('click', onClick1)

      // First click unmutes the video!
      function onClick1 () {
        elem.muted = false
        elem.parentElement.classList.remove('muted')

        elem.addEventListener('click', onClick2)
      }

      // All further clicks play/pause the video!
      function onClick2 () {
        if (elem.paused) elem.play()
        else elem.pause()
      }
    })

    torrent.on('wire', onWire)
    torrent.on('done', onDone)

    torrent.on('download', throttle(onProgress, 250))
    torrent.on('upload', throttle(onProgress, 250))
    setInterval(onProgress, 5000)
    onProgress()
  }

  function onWire (wire) {
    var id = wire.peerId.toString()
    graph.add({ id: id, name: wire.remoteAddress || 'Unknown' })
    graph.connect('You', id)
    wire.once('close', function () {
      graph.disconnect('You', id)
      graph.remove(id)
    })
  }

  function onProgress () {
    var percent = Math.round(torrent.progress * 100 * 100) / 100
    $progressBar.style.width = percent + '%'
    $numPeers.innerHTML = torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers')

    $downloaded.innerHTML = prettierBytes(torrent.downloaded)
    $total.innerHTML = prettierBytes(torrent.length)

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
    if (err) {
      window.alert(err)
      console.error(err)
    }
  }

  function onWarning (err) {
    if (err) {
      console.error(err)
    }
  }

  function getRtcConfig (cb) {
    // WARNING: This is *NOT* a public endpoint. Do not depend on it in your app.
    get.concat({
      url: 'https://instant.io/_rtcConfig',
      timeout: 5000
    }, function (err, res, data) {
      if (err || res.statusCode !== 200) {
        cb(new Error('Could not get WebRTC config from server. Using default (without TURN).'))
      } else {
        var rtcConfig
        try {
          rtcConfig = JSON.parse(data)
        } catch (err) {
          return cb(new Error('Got invalid WebRTC config from server: ' + data))
        }
        cb(null, rtcConfig)
      }
    })
  }
}
