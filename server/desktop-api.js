// WebTorrent Desktop server API
// - Tell auto-updaters the latest version
// - Log crash reports
// - Log telemetry
module.exports = { serve }

const bodyParser = require('body-parser')
const cp = require('child_process')
const express = require('express')
const fs = require('fs')
const mkdirp = require('mkdirp')
const multer = require('multer')
const path = require('path')
const semver = require('semver')
const url = require('url')

const auth = require('./auth')
const config = require('../config')
const secret = require('../secret')

var DESKTOP_VERSION = config.desktopVersion
var RELEASES_URL = 'https://github.com/feross/webtorrent-desktop/releases/download'

var TELEMETRY_PATH = path.join(config.logPath, 'telemetry')
var CRASH_REPORTS_PATH = path.join(config.logPath, 'crash-reports')

var SUMMARIZE_PATH = path.join(__dirname, '..', 'bin', 'summarize-telemetry.js')

// Attempt to create the needed log folders
try { mkdirp.sync(TELEMETRY_PATH) } catch (err) {}
try { mkdirp.sync(CRASH_REPORTS_PATH) } catch (err) {}

/**
 * Summarize the telemetry into summary.json, every three hours. Takes
 * a bit of time to crunch, so we do it in the background. The dashboard uses
 * the data in summary.json.
 *
 * This is a poor-man's cron-job. Not running in development by default to
 * avoid hitting Github's API too often.
 */
if (config.isProd) {
  summarizeTelemetry()
  setInterval(summarizeTelemetry, 3 * 3600 * 1000)
}

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
    var telemetryPath = path.join(TELEMETRY_PATH, today + '.log')

    fs.appendFile(telemetryPath, summaryJSON + '\n', function (err) {
      if (err) {
        console.error('Error saving telemetry: ' + err.message)
        res.status(500)
      }
      res.end()
    })
  })

  app.use('/desktop/telemetry/', [
    auth(secret.credentials),
    serveTelemetryDashboard,
    express.static(TELEMETRY_PATH)
  ])
}

// Summarize telemetry information: active users, monthly growth, most common errors, etc
function serveTelemetryDashboard (req, res, next) {
  if (req.url !== '/') return next()
  var orig = req.originalUrl // eg '/desktop/telemetry'
  if (!orig.endsWith('/')) return res.redirect(orig + '/')

  // Once we get here, we're serving this exact path: /desktop/telemetry/
  fs.readdir(TELEMETRY_PATH, function (err, files) {
    if (err) return res.status(500).send(err.message)

    var filesByMonth = []
    files.forEach(function (file, i) {
      if (i === 0 || file.substring(0, 7) !== files[i - 1].substring(0, 7)) {
        filesByMonth.push([])
      }
      filesByMonth[filesByMonth.length - 1].push(file)
    })

    // Load summary.json from the telemetry log folder...
    var summaryPath = path.join(TELEMETRY_PATH, 'summary.json')
    fs.readFile(summaryPath, 'utf8', function (err, summaryJSON) {
      var summary = err
        ? { telemetry: [] }
        : JSON.parse(summaryJSON)

      // Versions
      var versions = summary.releases
        .map(function (release) {
          // Tag name is something like 'v0.12.0', version is '0.12.0'
          return release.tag_name.substring(1)
        }).filter(function (version) {
          return semver.gt(version, '0.10.0')
        }).map(function (version) {
          return version === '0.11.0' ? 'pre-0.12' : version
        }).reverse()

      // Calculate week-on-week growth
      var telem = summary.telemetry
      var yesterday = telem && telem[telem.length - 2]
      var t7 = telem && telem[telem.length - 9]
      var percentWeeklyGrowth = (yesterday && t7)
        ? (100 * yesterday.actives.last7 / t7.actives.last7 - 100).toFixed(1)
        : '-'

      // Most common errors
      var latestVersion = versions[versions.length - 1]
      var mostCommonErrorsDate = yesterday ? yesterday.date : '-'
      var allErrors = (yesterday ? yesterday.errors : [])
        .map(function (err) {
          err.stack = err.stack.replace(/\(.*app.asar/g, '(...')
          return err
        })
      var mostCommonErrors = {
        all: allErrors.slice(0, 10),
        latest: allErrors.filter(function (err) {
          return err.versions.includes(latestVersion)
        }).slice(0, 10)
      }
      console.log('Latest version: ' + latestVersion)

      res.render('telemetry-dashboard', {
        filesByMonth,
        summary,
        percentWeeklyGrowth,
        mostCommonErrors,
        mostCommonErrorsDate,
        versions,
        latestVersion
      })
    })
  })
}

// Save electron process crash reports (from Crashpad), each in its own file
function serveCrashReportsAPI (app) {
  var upload = multer({ dest: CRASH_REPORTS_PATH }).single('upload_file_minidump')

  app.post('/desktop/crash-report', upload, function (req, res) {
    req.body.filename = req.file.filename
    var crashLog = JSON.stringify(req.body, undefined, 2)

    fs.writeFile(req.file.path + '.json', crashLog, function (err) {
      if (err) {
        console.error('Error saving crash report: ' + err.message)
        res.status(500)
      }
      res.end()
    })
  })
}

// This lets us send a message to all WebTorrent Desktop users
function serveAnnouncementsAPI (app) {
  app.get('/desktop/announcement', function (req, res) {
    res.status(200).json({
      title: 'WebTorrent Desktop Announcement',
      message: '🎉 WebTorrent just hit 250,000 installs! 🎉',
      detail: 'Thanks everyone!'
    })
    // res.status(204).end()
  })
}

// Tell the auto updaters when new version is available
function serveUpdateAPI (app) {
  // Deprecated: WebTorrent Desktop v0.0.0 - 0.2.0 use this update URL
  app.get('/app/update/?*', function (req, res) {
    res.redirect(301, req.url.replace('/app/', '/desktop/'))
  })

  // WebTorrent Desktop Mac auto-update endpoint
  app.get('/desktop/update', function (req, res) {
    var version = req.query.version
    logUpdateCheck({
      date: (new Date()).toString(),
      platform: req.query.platform,
      version: version,
      ip: req.ip
    })
    if (!semver.valid(version) || semver.lt(version, DESKTOP_VERSION)) {
      // Update is required. Send update JSON.
      // Response format docs: https://github.com/Squirrel/Squirrel.Mac#update-json-format
      res.status(200).send({
        name: 'WebTorrent v' + DESKTOP_VERSION,
        url: `${RELEASES_URL}/v${DESKTOP_VERSION}/WebTorrent-v${DESKTOP_VERSION}-darwin.zip`,
        version: DESKTOP_VERSION
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
      fileVersion = DESKTOP_VERSION
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
    var redirectURL = `${RELEASES_URL}/v${fileVersion}/${file}`
    res.redirect(302, redirectURL)
  })
}

function logUpdateCheck (log) {
  console.log('UPDATE CHECK: ' + JSON.stringify(log))
}

function summarizeTelemetry () {
  var child = cp.spawn(SUMMARIZE_PATH, [])
  child.on('close', function (code) {
    console.log(`Summarize telemetry script exited with code: ${code}`)
  })
}
