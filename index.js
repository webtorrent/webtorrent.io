/**
 * HTTP reverse proxy server. Yo dawg, I heard you like HTTP servers, so here
 * is an HTTP server for your HTTP servers.
 */

var auto = require('run-auto')
var config = require('./config')
var cp = require('child_process')
var debug = require('debug')('webtorrent:router')
var http = require('http')
var httpProxy = require('http-proxy')
var util = require('./util')

util.upgradeLimits()

var proxy = httpProxy.createServer({})
var server = http.createServer(function (req, res) {
  if (req.headers.host === 'tracker.webtorrent.io') {
    proxy.web(req, res, { target: 'http://127.0.0.1:' + config.ports.tracker.http })
  } else if (req.headers.host === 'instant.io') {
    proxy.web(req, res, { target: 'http://127.0.0.1:' + config.ports.instant })
  } else {
    proxy.web(req, res, { target: 'http://127.0.0.1:' + config.ports.web })
  }
})

auto({
  proxy: function (cb) {
    server.listen(config.ports.router, cb)
  },
  tracker: function (cb) {
    var tracker = cp.fork('./tracker')
    tracker.on('error', onError)
    tracker.on('message', cb.bind(null, null))
  },
  downgradeUid: ['proxy', 'tracker', function (cb) {
    util.downgradeUid()
    cb(null)
  }],
  web: ['downgradeUid', function (cb) {
    var web = cp.fork('./web')
    web.on('error', onError)
    web.on('message', cb.bind(null, null))
  }]
}, function (err) {
  debug('listening on ' + config.ports.router)
  if (err) throw err
})

function onError (err) {
  console.error(err.stack || err.message || err)
}
