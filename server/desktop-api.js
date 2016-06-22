// WebTorrent Desktop server API
// - Tell auto-updaters the latest version
// - Log crash reports
// - Log telemetry
module.exports = { serve }

const bodyParser = require('body-parser')
const config = require('../config')
const fs = require('fs')
const multer = require('multer')
const path = require('path')
const semver = require('semver')
const url = require('url')

var APP_VERSION = require('webtorrent-desktop/package.json').version
var RELEASE_PATH = 'https://github.com/feross/webtorrent-desktop/releases/download'

function serve (app) {
  serveTelemetryAPI(app)
  serveCrashReportsAPI(app)
  serveAnnouncementsAPI(app)
  serveUpdateAPI(app)
}

// Log telemetry JSON summaries to a file, one per line
function serveTelemetryAPI (app) {
  app.post('/desktop/telemetry', bodyParser.json(), function (req, res) {
    var summary = req.body
    summary.ip = req.ip
    var summaryJSON = JSON.stringify(summary)

    var today = new Date().toISOString().substring(0, 10) // YYYY-MM-DD
    var telemetryPath = path.join(config.logPath, 'telemetry', today + '.log')

    fs.appendFile(telemetryPath, summaryJSON + '\n', function (err) {
      if (err) {
        console.error('Error saving telemetry', err)
        res.status(500)
      }
      res.end()
    })
  })
}

// Save electron process crash reports (from Crashpad), each in its own file
function serveCrashReportsAPI (app) {
  var crashReportsPath = path.join(config.logPath, 'crash-reports')
  var upload = multer({ dest: crashReportsPath }).single('upload_file_minidump')

  app.post('/desktop/crash-report', upload, function (req, res) {
    req.body.filename = req.file.filename
    var crashLog = JSON.stringify(req.body, undefined, 2)

    fs.writeFile(req.file.path + '.json', crashLog, function (err) {
      if (err) return console.error('Error saving crash report: ' + err.message)
      console.log('Saved crash report:\n\t' + crashLog)
    })

    res.end()
  })
}

// This lets us send a message to all WebTorrent Desktop users
function serveAnnouncementsAPI (app) {
  app.get('/desktop/announcement', function (req, res) {
    res.status(204).end()
  })
}

// Tell the auto updaters when new version is available
function serveUpdateAPI (app) {
  // Deprecated: WebTorrent Desktop v0.0.0 - 0.2.0 use this update URL
  app.get('/app/update/?*', function (req, res) {
    res.redirect(301, req.url.replace('/app/', '/desktop/'))
  })

  // WebTorrent Desktop OS X auto-update endpoint
  app.get('/desktop/update', function (req, res) {
    var version = req.query.version
    logUpdateCheck({
      date: (new Date()).toString(),
      platform: req.query.platform,
      version: version,
      ip: req.ip
    })
    if (!semver.valid(version) || semver.lt(version, APP_VERSION)) {
      // Update is required. Send update JSON.
      // Response format docs: https://github.com/Squirrel/Squirrel.Mac#update-json-format
      res.status(200).send({
        name: 'WebTorrent v' + APP_VERSION,
        url: `${RELEASE_PATH}/v${APP_VERSION}/WebTorrent-v${APP_VERSION}-darwin.zip`,
        version: APP_VERSION
      })
    } else {
      // No update required. User is on latest app version.
      res.status(204).end()
    }
  })

  // WebTorrent Desktop Windows auto-update endpoint
  app.get('/desktop/update/*', function (req, res) {
    var pathname = url.parse(req.url).pathname
    var file = pathname.replace(/^\/desktop\/update\//i, '')
    var fileVersion
    if (file === 'RELEASES') {
      fileVersion = APP_VERSION
      logUpdateCheck({
        date: (new Date()).toString(),
        platform: req.query.platform,
        version: req.query.version,
        ip: req.ip
      })
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
}

function logUpdateCheck (log) {
  console.log('UPDATE CHECK: ' + JSON.stringify(log))
}

