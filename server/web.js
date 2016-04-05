var compress = require('compression')
var cors = require('cors')
var debug = require('debug')('webtorrent-www:web')
var downgrade = require('downgrade')
var express = require('express')
var highlight = require('highlight.js')
var http = require('http')
var jade = require('jade')
var marked = require('marked')
var path = require('path')
var unlimited = require('unlimited')
var url = require('url')

var config = require('../config')

var APP_VERSION = require('webtorrent-desktop/package.json').version
var RELEASE_PATH = 'https://github.com/feross/webtorrent-desktop/releases/download'

unlimited()

var app = express()
var server = http.createServer(app)

jade.filters.markdown = marked

marked.setOptions({
  highlight: function (code, lang) {
    var h = lang
      ? highlight.highlight(lang, code)
      : highlight.highlightAuto(code)
    return '<div class="hljs">' + h.value + '</div>'
  }
})

// Templating
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade')
app.set('x-powered-by', false)
app.engine('jade', jade.renderFile)

// Trust the X-Forwarded-* headers from http-proxy
app.enable('trust proxy')

app.use(compress())

app.use(function (req, res, next) {
  // Force SSL
  if (config.isProd && req.protocol !== 'https') {
    return res.redirect('https://' + (req.hostname || 'webtorrent.io') + req.url)
  }

  // Redirect www to non-www
  if (config.isProd && req.hostname === 'www.webtorrent.io') {
    return res.redirect('https://webtorrent.io' + req.url)
  }

  // Use HTTP Strict Transport Security
  // Lasts 1 year, incl. subdomains, allow browser preload list
  if (config.isProd) {
    res.header(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // Add cross-domain header for fonts, required by spec, Firefox, and IE.
  var extname = path.extname(url.parse(req.url).pathname)
  if (['.eot', '.ttf', '.otf', '.woff'].indexOf(extname) >= 0) {
    res.header('Access-Control-Allow-Origin', '*')
  }

  // Prevents IE and Chrome from MIME-sniffing a response. Reduces exposure to
  // drive-by download attacks on sites serving user uploaded content.
  res.header('X-Content-Type-Options', 'nosniff')

  // Prevent rendering of site within a frame.
  res.header('X-Frame-Options', 'DENY')

  // Enable the XSS filter built into most recent web browsers. It's usually
  // enabled by default anyway, so role of this headers is to re-enable for this
  // particular website if it was disabled by the user.
  res.header('X-XSS-Protection', '1; mode=block')

  // Force IE to use latest rendering engine or Chrome Frame
  res.header('X-UA-Compatible', 'IE=Edge,chrome=1')

  next()
})

/**
 * Enable CORS preflight, and cache it for 1 hour. This is necessary to support
 * requests from another domain with the "Range" HTTP header.
 */
app.options('/torrents/*', cors({ maxAge: 60 * 60 }))

app.get('/torrents/*', cors(), express.static(path.join(__dirname, '../static')))

app.use(express.static(path.join(__dirname, '../static')))

app.get('/', function (req, res) {
  res.render('home', { rawTitle: 'WebTorrent - Streaming browser torrent client' })
})

app.get('/desktop', function (req, res) {
  res.render('desktop', { rawTitle: 'WebTorrent Desktop', version: APP_VERSION })
})

app.get('/intro', function (req, res) {
  res.render('intro', { rawTitle: 'WebTorrent Tutorial - Get Started' })
})

app.get('/docs', function (req, res) {
  res.render('docs', { rawTitle: 'WebTorrent API Documentation' })
})

app.get('/faq', function (req, res) {
  res.render('faq', { rawTitle: 'WebTorrent FAQ' })
})

app.get('/create', function (req, res) {
  res.render('create', { title: 'Create a .torrent file' })
})

app.get('/logs', function (req, res) {
  res.redirect(301, 'https://botbot.me/freenode/webtorrent/')
})

// Deprecated: WebTorrent Desktop v0.0.0 - 0.2.0 use this update URL
app.get('/app/update/?*', function (req, res) {
  res.redirect(301, req.url.replace('/app/', '/desktop/'))
})

// WebTorrent.app OS X auto-update endpoint
app.get('/desktop/update', function (req, res) {
  var version = req.query.version
  logUpdateCheck({
    platform: 'darwin',
    version: version,
    ip: req.ip
  })
  if (version === APP_VERSION) {
    // No update required. User is on latest app version.
    res.status(204).end()
  } else {
    // Update is required. Send update JSON.
    // Response format docs: https://github.com/Squirrel/Squirrel.Mac#update-json-format
    res.status(200).send({
      name: 'WebTorrent v' + APP_VERSION,
      url: `${RELEASE_PATH}/v${APP_VERSION}/WebTorrent-v${APP_VERSION}.zip`,
      version: APP_VERSION
    })
  }
})

// WebTorrent.app Windows auto-update endpoint
app.get('/desktop/update/*', function (req, res) {
  logUpdateCheck({
    platform: 'darwin',
    version: req.query.version,
    ip: req.ip
  })
  var pathname = url.parse(req.url).pathname
  var file = pathname.replace(/^\/desktop\/update\//i, '')
  var fileVersion
  if (file === 'RELEASES') {
    fileVersion = APP_VERSION
  } else {
    var match = /-(\d+\.\d+\.\d+)-/.exec(file)
    fileVersion = match && match[1]
  }
  if (!fileVersion) {
    return res.status(404).end()
  }
  var redirectURL = `${RELEASE_PATH}/v${fileVersion}/${file}`
  res.redirect(302, redirectURL)
})

function logUpdateCheck (log) {
  console.log('UPDATE CHECK: ' + JSON.stringify(log))
}

app.get('*', function (req, res) {
  res.status(404).render('error', {
    title: '404 Not Found',
    message: '404 Not Found'
  })
})

// error handling middleware
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).render('error', {
    title: '500 Server Error',
    message: '500 Server Error'
  })
})

server.listen(config.ports.web, function () {
  debug('listening on port ' + server.address().port)
  downgrade()
  process.send('ready')
})
