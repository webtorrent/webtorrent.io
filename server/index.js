require('./rollbar')

const compress = require('compression')
const cors = require('cors')
const express = require('express')
const highlight = require('highlight.js')
const http = require('http')
const morgan = require('morgan')
const path = require('path')
const pug = require('pug')
const { Remarkable } = require('remarkable')

const config = require('../config')
const desktopApi = require('./desktop-api')

const PORT = Number(process.argv[2]) || 4000

const app = express()
const server = http.createServer(app)

const remark = new Remarkable({
  html: true,
  highlight: function (code, lang) {
    const h = lang
      ? highlight.highlight(lang, code)
      : highlight.highlightAuto(code)
    return '<div class="hljs">' + h.value + '</div>'
  }
})

pug.filters.markdown = (md, options) => {
  return remark.render(md)
}

// Trust "X-Forwarded-For" and "X-Forwarded-Proto" nginx headers
app.enable('trust proxy')

// Disable "powered by express" header
app.set('x-powered-by', false)

// Use pug for templates
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')
app.engine('pug', pug.renderFile)

// Pretty print JSON
app.set('json spaces', 2)

// Use GZIP
app.use(compress())

// Use SSL
app.use(function (req, res, next) {
  // Force SSL
  if (config.isProd && req.protocol !== 'https') {
    return res.redirect('https://' + (req.hostname || 'webtorrent.io') + req.url) // lgtm [js/server-side-unvalidated-url-redirection]
  }

  // Redirect www to non-www
  if (config.isProd && req.hostname === 'www.webtorrent.io') {
    return res.redirect('https://webtorrent.io' + req.url) // lgtm [js/server-side-unvalidated-url-redirection]
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
  const extname = path.extname(req.url)
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

// Serve the demo torrent (Sintel)
// Enable CORS preflight, and cache it for 1 hour. This is necessary to support
// requests from another domain with the "Range" HTTP header.
app.options('/torrents/*', cors({ maxAge: 60 * 60 }))
app.get('/torrents/*', cors(), express.static(path.join(__dirname, '../static')))

// Serve static resources
app.use(express.static(path.join(__dirname, '../static')))

// Serve the Webtorrent Desktop REST API
desktopApi.serve(app)

// Log requests
app.use(morgan(config.isProd ? 'combined' : 'dev', { immediate: !config.isProd }))

// Serve all the pug pages
app.get('/', function (req, res) {
  res.render('home', { rawTitle: 'WebTorrent - Streaming browser torrent client' })
})

app.get('/desktop', function (req, res) {
  res.render('desktop', {
    cls: 'desktop',
    rawTitle: 'WebTorrent Desktop - Streaming torrent app for Mac, Windows, and Linux',
    version: config.desktopVersion
  })
})

app.get('/desktop-download/:platform', function (req, res, next) {
  const platform = req.params.platform
  const version = config.desktopVersion
  if (!['mac', 'windows', 'linux'].includes(platform)) {
    return next()
  }

  let downloadUrl
  if (platform === 'mac') {
    downloadUrl = `https://github.com/webtorrent/webtorrent-desktop/releases/download/v${version}/WebTorrent-v${version}.dmg`
  } else if (platform === 'windows') {
    downloadUrl = `https://github.com/webtorrent/webtorrent-desktop/releases/download/v${version}/WebTorrentSetup-v${version}.exe`
  } else if (platform === 'linux') {
    downloadUrl = `https://github.com/webtorrent/webtorrent-desktop/releases/download/v${version}/webtorrent-desktop_${version}_amd64.deb`
  }

  res.render('desktop-download', {
    rawTitle: 'Thank you for downloading WebTorrent',
    downloadUrl,
    version
  })
})

app.get('/intro', function (req, res) {
  res.render('intro', { rawTitle: 'WebTorrent Tutorial - Get Started' })
})

app.get('/free-torrents', function (req, res) {
  res.render('free-torrents', { title: 'Free Torrents - Public Domain, Creative Commons' })
})

app.get('/docs', function (req, res) {
  res.render('docs', { rawTitle: 'WebTorrent API Documentation' })
})

app.get('/faq', function (req, res) {
  res.render('faq', { rawTitle: 'WebTorrent FAQ' })
})

app.get('/expressvpn', function (req, res) {
  res.redirect(301, 'https://www.get-express-vpn.com/offer/torrent-vpn-1?a_fid=wt&offer=3monthsfree')
})

app.get('/expressvpn2', function (req, res) {
  res.redirect(301, 'https://www.xvbelink.com/?a_fid=wt&offer=3monthsfree')
})

// app.get('/500', (req, res, next) => {
//   next(new Error('Manually visited /500'))
// })

// Handle 404 for unrecognized URLs
app.get('*', function (req, res) {
  res.status(404).render('error', {
    title: '404 Not Found',
    message: '404 Not Found'
  })
})

if (global.rollbar) app.use(global.rollbar.errorHandler())

// Handle 500 errors
app.use(function (err, req, res, next) {
  console.error(err.stack)
  const code = typeof err.code === 'number' ? err.code : 500
  res.status(code).render('error', {
    title: '500 Server Error',
    message: '500 Server Error'
  })
})

server.listen(PORT, '127.0.0.1', function () {
  console.log('Listening on port %s', server.address().port)
})
