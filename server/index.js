/**
 * HTTP reverse proxy server. Yo dawg, I heard you like HTTP servers, so here
 * is an HTTP server for your HTTP servers.
 */

var auto = require('run-auto')
var config = require('../config')
var cp = require('child_process')
var debug = require('debug')('webtorrent-website:router')
var fs = require('fs')
var http = require('http')
var httpProxy = require('http-proxy')
var https = require('https')
var util = require('../util')

util.upgradeLimits()

var proxy = httpProxy.createServer({})

function onRequest (req, res) {
  if (req.headers.host === 'tracker.webtorrent.io') {
    proxy.web(req, res, { target: 'http://127.0.0.1:' + config.ports.tracker.http })
  } else if (req.headers.host === 'instant.io') {
    proxy.web(req, res, { target: 'http://127.0.0.1:' + config.ports.instant })
  } else {
    proxy.web(req, res, { target: 'http://127.0.0.1:' + config.ports.web })
  }
}

var httpServer = http.createServer(onRequest)
var httpsServer = https.createServer({
  key: fs.readFileSync(__dirname + '/../secret/webtorrent.io.key'),
  cert: fs.readFileSync(__dirname + '/../secret/webtorrent.io.chained.crt')
}, onRequest)

auto({
  httpServer: function (cb) {
    httpServer.listen(config.ports.router.http, cb)
  },
  httpsServer: function (cb) {
    httpsServer.listen(config.ports.router.https, cb)
  },
  tracker: function (cb) {
    var tracker = cp.fork(__dirname + '/tracker')
    tracker.on('error', onError)
    tracker.on('message', cb.bind(null, null))
  },
  downgradeUid: ['httpServer', 'httpsServer', 'tracker', function (cb) {
    util.downgradeUid()
    cb(null)
  }],
  web: ['downgradeUid', function (cb) {
    var web = cp.fork(__dirname + '/web')
    web.on('error', onError)
    web.on('message', cb.bind(null, null))
  }]
}, function (err) {
  debug('listening on %s', JSON.stringify(config.ports.router))
  if (err) throw err
})

function onError (err) {
  console.error(err.stack || err.message || err)
}
