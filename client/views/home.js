const fs = require('fs')
const moment = require('moment')
const P2PGraph = require('p2p-graph')
const path = require('path')
const prettierBytes = require('prettier-bytes')
const throttle = require('throttleit')
const WebTorrent = require('webtorrent')

const TORRENT = fs.readFileSync(
  path.join(__dirname, '../../static/torrents/sintel.torrent')
)

module.exports = function () {
  let graph
  let hero = document.querySelector('#hero')
  let torrent

  // Don't start the demo automatically on mobile.
  if (window.innerWidth <= 899) {
    let beginButton = document.createElement('a')
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
    graph.add({ id: 'You', name: 'You', me: true })

    // Create client
    const client = window.client = new WebTorrent()
    client.on('warning', onWarning)
    client.on('error', onError)

    // Create torrent
    torrent = client.add(TORRENT, onTorrent)
  }

  const $body = document.body
  const $progressBar = document.querySelector('#progressBar')
  const $numPeers = document.querySelector('#numPeers')
  const $downloaded = document.querySelector('#downloaded')
  const $total = document.querySelector('#total')
  const $remaining = document.querySelector('#remaining')

  function onTorrent () {
    const file = torrent.files.find(function (file) {
      return file.name.endsWith('.mp4')
    })

    const opts = {
      autoplay: true,
      muted: true
    }

    const videoOverlay = document.querySelector('.videoOverlay')

    file.appendTo('#videoWrap .video', opts, function (err, elem) {
      if (err) return onError(err)
      elem.parentElement.classList.add('canplay')
      elem.parentElement.classList.add('muted')

      videoOverlay.addEventListener('click', onClick1)

      // First click unmutes the video!
      function onClick1 () {
        videoOverlay.removeEventListener('click', onClick1)

        elem.muted = false
        elem.parentElement.classList.remove('muted')
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
    const id = wire.peerId.toString()
    graph.add({ id: id, name: wire.remoteAddress || 'Unknown' })
    graph.connect('You', id)
    wire.once('close', function () {
      graph.disconnect('You', id)
      graph.remove(id)
    })
  }

  function onProgress () {
    const percent = Math.round(torrent.progress * 100 * 100) / 100
    $progressBar.style.width = percent + '%'
    $numPeers.innerHTML = torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers')

    $downloaded.innerHTML = prettierBytes(torrent.downloaded)
    $total.innerHTML = prettierBytes(torrent.length)

    let remaining
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
}
