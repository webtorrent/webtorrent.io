var createTorrent = require('create-torrent')
var dragDrop = require('drag-drop')
var parseTorrent = require('parse-torrent')

dragDrop('body', newTorrent)

function newTorrent (files) {
  window.files = files
  createTorrent(files, function (err, torrent) {
    if (err) console.error(err.stack || err.message || err)
    window.torrent = torrent

    var parsedTorrent = parseTorrent(torrent)
    var fileName = parsedTorrent.name + '.torrent'

    var url = URL.createObjectURL(new Blob([ torrent ]))
    var a = document.createElement('a')
    a.download = fileName
    a.href = url
    a.textContent = 'download ' + fileName
    document.body.appendChild(a)
  })
}
