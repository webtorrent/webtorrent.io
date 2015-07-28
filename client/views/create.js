/* global URL, Blob */
var createTorrent = require('create-torrent')
var dragDrop = require('drag-drop')
var parseTorrent = require('parse-torrent')

module.exports = function () {
  dragDrop('body', onDrop)
}

function onDrop (files) {
  createTorrent(files, function (err, torrent) {
    // TODO: show error to user
    if (err) console.error(err.stack || err.message || err)

    var parsedTorrent = parseTorrent(torrent)
    var fileName = parsedTorrent.name + '.torrent'

    var url = URL.createObjectURL(new Blob([ torrent ]))

    var a = document.createElement('a')
    a.download = fileName
    a.href = url
    a.textContent = 'download ' + fileName
    document.body.appendChild(a)

    // TODO: show more metadata about the .torrent
  })
}
