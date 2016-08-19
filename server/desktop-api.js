// WebTorrent Desktop server API
// - Tell auto-updaters the latest version
// - Log crash reports
// - Log telemetry
module.exports = { serve }

const bodyParser = require('body-parser')
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

// Attempt to create the needed log folders
try { mkdirp.sync(TELEMETRY_PATH) } catch (err) {}
try { mkdirp.sync(CRASH_REPORTS_PATH) } catch (err) {}

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
  var isSummary = false
  if (req.url === '/') {
    var path = req.originalUrl // eg '/desktop/telemetry'
    if (!path.endsWith('/')) return res.redirect(path + '/')
  } else if (req.url === '/summary') {
    isSummary = true
  } else {
    return next()
  }

  fs.readdir(TELEMETRY_PATH, function (err, files) {
    if (err) return res.status(500).send(err.message)

    var filesByMonth = []
    files.forEach(function (file, i) {
      if (i === 0 || file.substring(0, 7) !== files[i - 1].substring(0, 7)) {
        filesByMonth.push([])
      }
      filesByMonth[filesByMonth.length - 1].push(file)
    })

    loadSummary(files).then(function (summary) {
      if (isSummary) res.json(summary)
      else res.render('telemetry-dashboard', {filesByMonth, summary})
    }).catch(function (err) {
      res.status(500).send(err.message)
    })
  })
}

function loadSummary (files) {
  var logFiles = files.filter((f) => /\d{4}-\d{2}-\d{2}.log/.test(f))
  console.log('Computing summary for ' + logFiles.length + ' files')
  return Promise.all(logFiles.map(function (file) {
    return new Promise(function (resolve, reject) {
      var filePath = path.join(TELEMETRY_PATH, file)
      fs.readFile(filePath, 'utf8', function (err, json) {
        if (err) return reject(err)
        try {
          var lines = json.trim().split('\n')
          var records = lines.map(JSON.parse)
        } catch (err) {
          return reject(err)
        }
        console.log('Read ' + records.length + ' rows from ' + file)
        var uniqueUsers = {}
        records.forEach(function (record) {
          uniqueUsers[record.userID] = true
        })
        return resolve({
          date: file.substring(0, 10),
          uniqueUsers
        })
      })
    })
  })).then(function (days) {
    var uniqueUsers = {}
    return days.map(function (day, i) {
      Object.assign(uniqueUsers, day.uniqueUsers)
      return {
        date: day.date,
        actives: {
          today: computeActives(days, i, 1),
          day7: computeActives(days, i, 7),
          day30: computeActives(days, i, 30)
        },
        retention: {
          day1: i < 1 ? null : computeRetention(day, days[i - 1]),
          day7: i < 7 ? null : computeRetention(day, days[i - 7]),
          day28: i < 28 ? null : computeRetention(day, days[i - 28])
        },
        errors: {} // TODO
      }
    })
  })
}

function computeActives (days, index, numPrev) {
  if (index < numPrev - 1) return null
  var combined = {}
  for (var i = index - numPrev + 1; i <= index; i++) {
    Object.assign(combined, days[i].uniqueUsers)
  }
  return Object.keys(combined).length
}

function computeRetention (day, prevDay) {
  var combined = Object.assign({}, day.uniqueUsers, prevDay.uniqueUsers)
  var numCombined = Object.keys(combined).length
  var numToday = Object.keys(day.uniqueUsers).length
  var numPrev = Object.keys(prevDay.uniqueUsers).length
  var numLost = numCombined - numToday
  return (numPrev - numLost) / numPrev
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
    res.status(204).end()
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
