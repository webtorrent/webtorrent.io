// WebTorrent Desktop server API
// - Tell auto-updaters the latest version
// - Log crash reports
// - Log telemetry
module.exports = { serve }

const bodyParser = require('body-parser')
const cp = require('child_process')
const express = require('express')
const expressRateLimit = require('express-rate-limit')
const fs = require('fs')
const multer = require('multer')
const path = require('path')
const semver = require('semver')
const URL = require('url').URL

const auth = require('./auth')
const config = require('../config')
const secret = require('../secret')

const DESKTOP_VERSION = config.desktopVersion
const RELEASES_URL = 'https://github.com/webtorrent/webtorrent-desktop/releases/download'

const TELEMETRY_PATH = path.join(config.logPath, 'telemetry')
const CRASH_REPORTS_PATH = path.join(config.logPath, 'crash-reports')

const SUMMARIZE_PATH = path.join(__dirname, '..', 'bin', 'summarize-telemetry.js')

// Queue telemetry messages, log them to a file in order
let telemetryLines = []
let isWritingTelemetry = false

// Attempt to create the needed log folders
try { fs.mkdirSync(TELEMETRY_PATH, { recursive: true }) } catch (err) {}
try { fs.mkdirSync(CRASH_REPORTS_PATH, { recursive: true }) } catch (err) {}

/**
 * Summarize the telemetry into summary.json, every day at UTC 12:15AM. Takes
 * a bit of time to crunch, so we do it in the background. The dashboard uses
 * the data in summary.json.
 *
 * This is a poor-man's cron-job. Not running in development by default to
 * avoid hitting Github's API too often.
 */
if (config.isProd) cronSummarizeTelemetry()

function cronSummarizeTelemetry () {
  // Run immediately
  summarizeTelemetry()

  // Wait until tomorrow, 12:15AM UTC
  const msPerDay = 24 * 3600 * 1000
  const msOfDay = new Date().getTime() % msPerDay
  const msWait = (msPerDay - msOfDay + (15 * 60 * 1000)) % msPerDay
  const minsWait = msWait / 60 / 1000
  console.log('Running summarizeTelemetry next in ' + minsWait + ' minutes')
  setTimeout(cronSummarizeTelemetry, msWait)
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
    const summary = req.body
    summary.ip = req.ip
    const summaryJSON = JSON.stringify(summary)
    telemetryLines.push(summaryJSON)
    writeTelemetryLines()
    res.end()
  })

  app.use('/desktop/telemetry/', [
    auth(secret.credentials),
    serveTelemetryDashboard,
    express.static(TELEMETRY_PATH)
  ])
}

function writeTelemetryLines () {
  if (isWritingTelemetry) return // Don't interleave writes
  if (telemetryLines.length === 0) return // Nothing to do

  const today = new Date().toISOString().substring(0, 10) // YYYY-MM-DD
  const telemetryPath = path.join(TELEMETRY_PATH, today + '.log')
  const lines = telemetryLines.join('\n') + '\n'
  telemetryLines = []
  isWritingTelemetry = true
  fs.appendFile(telemetryPath, lines, function (err) {
    isWritingTelemetry = false
    if (err) console.error('Error saving telemetry: ' + err.message)
    writeTelemetryLines()
  })
}

// Summarize telemetry information: active users, monthly growth, most common errors, etc
function serveTelemetryDashboard (req, res, next) {
  if (req.url !== '/') return next()
  const orig = req.originalUrl // eg '/desktop/telemetry'
  if (!orig.endsWith('/')) return res.redirect(orig + '/')

  // Once we get here, we're serving this exact path: /desktop/telemetry/
  fs.readdir(TELEMETRY_PATH, function (err, files) {
    if (err) return res.status(500).send(err.message)

    const filesByMonth = []
    files.forEach(function (file, i) {
      if (i === 0 || file.substring(0, 7) !== files[i - 1].substring(0, 7)) {
        filesByMonth.push([])
      }
      filesByMonth[filesByMonth.length - 1].push(file)
    })

    // Load summary.json from the telemetry log folder...
    const summaryPath = path.join(TELEMETRY_PATH, 'summary.json')
    fs.readFile(summaryPath, 'utf8', function (err, summaryJSON) {
      const summary = err
        ? { telemetry: [] }
        : JSON.parse(summaryJSON)

      // Versions
      const versions = summary.releases
        .map(function (release) {
          // Tag name is something like 'v0.12.0', version is '0.12.0'
          return release.tag_name.substring(1)
        }).filter(function (version) {
          return semver.gt(version, '0.10.0')
        }).map(function (version) {
          return version === '0.11.0' ? 'pre-0.12' : version
        }).reverse()

      // Calculate week-on-week growth
      const telem = summary.telemetry
      const yesterday = telem && telem[telem.length - 2]
      const t7 = telem && telem[telem.length - 9]
      const percentWeeklyGrowth = (yesterday && t7)
        ? ((100 * yesterday.actives.last7 / t7.actives.last7) - 100).toFixed(1)
        : '-'

      // Most common errors
      const latestVersion = versions[versions.length - 1]
      const mostCommonErrorsDate = yesterday ? yesterday.date : '-'
      const allErrors = (yesterday ? yesterday.errors : [])
        .map(function (err) {
          err.stack = err.stack.replace(/\(.*app.asar/g, '(...')
          return err
        })
      const mostCommonErrors = {
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
  const upload = multer({ dest: CRASH_REPORTS_PATH }).single('upload_file_minidump')

  const apiLimiter = expressRateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 1 day
    max: 5
  })

  app.post('/desktop/crash-report', apiLimiter, upload, function (req, res) {
    if (!req.file) return res.status(500).end()

    req.body.filename = req.file.filename
    const crashLog = JSON.stringify(req.body, undefined, 2)

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
    res.status(204).end()
  })
}

// Tell the auto updaters when new version is available
function serveUpdateAPI (app) {
  // Deprecated: WebTorrent Desktop v0.0.0 - 0.2.0 use this update URL
  app.get('/app/update/?*', function (req, res) {
    res.redirect(301, req.url.replace('/app/', '/desktop/')) // lgtm [js/server-side-unvalidated-url-redirection]
  })

  // WebTorrent Desktop Mac auto-update endpoint
  app.get('/desktop/update', function (req, res) {
    const version = req.query.version
    logUpdateCheck({
      date: (new Date()).toString(),
      platform: req.query.platform,
      version: version,
      sysarch: req.query.sysarch,
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
    const pathname = new URL(req.url, 'http://example.com').pathname
    let filename = pathname.replace(/^\/desktop\/update\//i, '')

    const sysarch = req.query.sysarch || 'ia32' // if not specified, default to ia32
    let fileVersion
    if (filename === 'RELEASES') {
      logUpdateCheck({
        date: (new Date()).toString(),
        platform: req.query.platform,
        version: req.query.version,
        sysarch: sysarch,
        ip: req.ip
      })
      fileVersion = DESKTOP_VERSION
      if (sysarch === 'ia32') {
        // 32-bit Windows users get a different Squirrel RELEASES file
        filename = 'RELEASES-ia32'
      }
    } else {
      const match = /-(\d+\.\d+\.\d+)-/.exec(filename)
      fileVersion = match && match[1]
    }
    if (!fileVersion) {
      return res.status(404).end()
    }
    const redirectURL = `${RELEASES_URL}/v${fileVersion}/${filename}`
    res.redirect(302, redirectURL)
  })
}

function logUpdateCheck (log) {
  console.log('UPDATE CHECK: ' + JSON.stringify(log))
}

function summarizeTelemetry () {
  const child = cp.spawn(SUMMARIZE_PATH, [])

  // Log the progress, for easier debugging...
  child.stdout.pipe(process.stdout)
  child.stderr.pipe(process.stderr)

  child.on('close', function (code) {
    console.log(`Summarize telemetry script exited with code: ${code}`)
  })
}
