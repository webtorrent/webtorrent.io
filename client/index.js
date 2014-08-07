var createTorrent = require('create-torrent')
var dragDrop = require('drag-drop')

dragDrop('body', newTorrent)

function newTorrent (files) {
  window.files = files
  createTorrent(files, function (err, torrent) {
    if (err) console.error(err.stack || err.message || err)
    window.torrent = torrent

    var url = URL.createObjectURL(new Blob([ torrent ]))
    var a = document.createElement('a')
    a.download = 'file'
    a.href = url
    a.textContent = 'download .torrent'
    document.body.appendChild(a)
  })
}
