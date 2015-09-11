var compress = require('compression')
var debug = require('debug')('webtorrent-ww:web')
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
app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.set('x-powered-by', false)
app.engine('jade', jade.renderFile)

// Trust the X-Forwarded-* headers from nginx
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

  // Strict transport security (to prevent MITM attacks on the site)
  if (config.isProd) {
    res.header('Strict-Transport-Security', 'max-age=31536000')
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

app.use(express.static(__dirname + '/../static'))

app.get('/', function (req, res) {
  res.render('home', { rawTitle: 'WebTorrent - Streaming browser torrent client' })
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

server.listen(config.ports.web, function (err) {
  if (err) throw err
  debug('listening on port ' + config.ports.web)
  downgrade()
  process.send('ready')
})
