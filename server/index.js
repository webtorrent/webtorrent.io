/**
 * HTTP reverse proxy server. Yo dawg, I heard you like HTTP servers, so here
 * is an HTTP server for your HTTP servers.
 */

var auto = require('run-auto')
var config = require('../config')
var cp = require('child_process')
var debug = require('debug')('webtorrent-www:router')
var downgrade = require('downgrade')
var fs = require('fs')
var http = require('http')
var httpProxy = require('http-proxy')
var https = require('https')
var path = require('path')
var unlimited = require('unlimited')

unlimited()

var proxy = httpProxy.createProxyServer({
  xfwd: true
})

proxy.on('error', function (err, req, res) {
  debug('[proxy error] %s %s %s', req.method, req.url, err.message)

  if (!res.headersSent) {
    res.writeHead(500, { 'content-type': 'application/json' })
  }

  res.end(JSON.stringify({ err: err.message }))
})

var secretKey, secretCert
try {
  secretKey = fs.readFileSync(path.join(__dirname, '../secret/webtorrent.io.key'))
  secretCert = fs.readFileSync(path.join(__dirname, '../secret/webtorrent.io.chained.crt'))
} catch (err) {}

function onRequest (req, res) {
  if (req.headers.host === 'tracker.webtorrent.io' ||
      req.headers.host === 'tracker.webtorrent.io:' + config.ports.router.https) {
    proxy.web(req, res, { target: 'http://127.0.0.1:' + config.ports.tracker })
  } else if (req.headers.host === 'whiteboard.webtorrent.io' ||
      req.headers.host === 'whiteboard.webtorrent.io:' + config.ports.router.https) {
    proxy.web(req, res, { target: 'http://127.0.0.1:' + config.ports.whiteboard })
  } else {
    proxy.web(req, res, { target: 'http://127.0.0.1:' + config.ports.web })
  }
}

function onUpgrade (req, socket, head) {
  proxy.ws(req, socket, head, { target: 'ws://127.0.0.1:' + config.ports.tracker })
}

var httpServer = http.createServer(onRequest)
httpServer.on('upgrade', onUpgrade)

var httpsServer
if (secretKey && secretCert) {
  httpsServer = https.createServer({ key: secretKey, cert: secretCert }, onRequest)
  httpsServer.on('upgrade', onUpgrade)
}

var web, tracker

auto({
  httpServer: function (cb) {
    httpServer.listen(config.ports.router.http, config.host, cb)
  },
  httpsServer: function (cb) {
    if (httpsServer) httpsServer.listen(config.ports.router.https, config.host, cb)
    else cb(null)
  },
  tracker: function (cb) {
    tracker = spawn(__dirname + '/tracker')
    tracker.on('message', cb.bind(null, null))
  },
  downgrade: ['httpServer', 'httpsServer', 'tracker', function (cb) {
    downgrade()
    cb(null)
  }],
  web: ['downgrade', function (cb) {
    web = spawn(__dirname + '/web')
    web.on('message', cb.bind(null, null))
  }]
}, function (err) {
  debug('listening on %s', JSON.stringify(config.ports.router))
  if (err) throw err
})

function onError (err) {
  console.error(err.stack || err.message || err)
}

function spawn (program) {
  var child = cp.spawn('node', [ program ], {
    stdio: [ process.stdin, process.stdout, process.stderr, 'ipc' ]
  })
  child.on('error', onError)
  return child
}

process.on('uncaughtException', function (err) {
  onError(err)

  // kill all processes in the "process group", i.e. this process and the children
  try {
    process.kill(-process.pid)
  } catch (err) {}
})
