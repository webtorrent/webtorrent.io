#!/usr/bin/env node

const get = require('simple-get')
const config = require('../config')
const path = require('path')
const fs = require('fs')

const TELEMETRY_PATH = path.join(config.logPath, 'telemetry')

main()

function main () {
  // Find all files in the telemetry folder...
  fs.readdir(TELEMETRY_PATH, function (err, files) {
    if (err) die(err)

    // Filter down to just log files...
    var logFiles = files.filter((f) => /\d{4}-\d{2}-\d{2}.log/.test(f))

    var summary = {}
    // Read them all and collect summary stats...
    loadTelemetrySummary(logFiles).then(function (telemetry) {
      summary.telemetry = telemetry
      // Load WebTorrent Desktop release history from Github...
      return loadReleases()
    }).then(function (releases) {
      summary.releases = releases
      // Finally, write summary.json
      var summaryPath = path.join(TELEMETRY_PATH, 'summary.json')
      var summaryJSON = JSON.stringify(summary, null, 2) // pretty print
      fs.writeFile(summaryPath, summaryJSON, function (err) {
        if (err) die(err)
        console.log('Done!')
      })
    }).catch(die)
  })
}

function die (err) {
  console.error(err)
  process.exit(1)
}

// Reads telemetry log files in parallel, then produces a summary array, one
// entry for each day: [{date, actives, retention, ...}, ...]
function loadTelemetrySummary (logFiles) {
  console.log('Summarizing ' + logFiles.length + ' telemetry log files')
  return Promise.all(logFiles.map(function (filename) {
    return new Promise(function (resolve, reject) {
      // Read each telemetry log file, one per day...
      var filePath = path.join(TELEMETRY_PATH, filename)
      fs.readFile(filePath, 'utf8', function (err, json) {
        if (err) return reject(err)

        // Each log file contains one JSON record per line
        try {
          var lines = json.trim().split('\n')
          var records = lines.map(JSON.parse)
        } catch (err) {
          return reject(err)
        }
        console.log('Read ' + records.length + ' rows from ' + filename)
        resolve(summarizeDailyTelemetryLog(filename, records))
      })
    })
  })).then(combineDailyTelemetrySummaries)
}

// Summarize a potentially huge (GB+) log file down to a few KB...
function summarizeDailyTelemetryLog (filename, records) {
  var uniqueUsers = {}
  var sessions = { total: 0, errored: 0 }
  var errors = {}
  var versionByUser = {}

  records.forEach(function (record) {
    // Filter out *very* rare empty records that only have {ip}
    if (!record.system) return

    // Count unique users
    var version = (record.version || 'pre-0.12')
    var platform = record.system.osPlatform
    uniqueUsers[record.userID] = true
    versionByUser[record.userID] = {version, platform}

    // Approximate sessions by # of telemetry reports
    sessions.total++

    // Summarize uncaught errors
    var errs = record.uncaughtErrors
    if (!errs || errs.length === 0) return
    sessions.errored++

    errs.forEach(function (error) {
      var key = error.message ? error.message.substring(0, 30) : '<missing error message>'
      if (errors[key]) {
        errors[key].count++
        addToSet(platform, errors[key].platforms)
        addToSet(version, errors[key].versions)
        return
      }
      errors[key] = {
        key: key,
        message: error.message,
        stack: error.stack,
        count: 1,
        versions: [version],
        platforms: [platform]
      }
    })
  })

  // Summarize usage by app version and OS
  var usage = {
    version: {},
    platform: {},
    versionPlatform: {}
  }
  for (var uid in versionByUser) {
    var v = versionByUser[uid]
    var vp = v.version + '-' + v.platform
    usage.version[v.version] = (usage.version[v.version] || 0) + 1
    usage.platform[v.platform] = (usage.platform[v.platform] || 0) + 1
    usage.versionPlatform[vp] = (usage.versionPlatform[vp] || 0) + 1
  }

  return {
    date: filename.substring(0, 10), // YYYY-MM-DD
    sessions,
    uniqueUsers,
    errors,
    usage
  }
}

// Adds an element to an array if it doesn't exist yet, the sorts the array
function addToSet (elem, arr) {
  if (arr.includes(elem)) return
  arr.push(elem)
  arr.sort()
}

// Combine all the per-day summaries into a single summary...
function combineDailyTelemetrySummaries (days) {
  var uniqueUsers = {}
  return days.map(function (day, i) {
    var numUsersYesterday = Object.keys(uniqueUsers).length
    Object.assign(uniqueUsers, day.uniqueUsers)
    var numInstalls = Object.keys(uniqueUsers).length - numUsersYesterday
    var errors = Object.keys(day.errors)
      .map((key) => day.errors[key])
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    return {
      date: day.date,
      actives: {
        today: computeActives(days, i, 1),
        last7: computeActives(days, i, 7),
        last30: computeActives(days, i, 30)
      },
      installs: numInstalls,
      retention: {
        day1: i < 1 ? null : computeRetention(day, days[i - 1]),
        day7: i < 7 ? null : computeRetention(day, days[i - 7]),
        day28: i < 28 ? null : computeRetention(day, days[i - 28])
      },
      usage: day.usage,
      errorRates: {
        today: computeErrorRate(days, i, 1),
        last7: computeErrorRate(days, i, 7)
      },
      errors
    }
  })
}

// Finds the fraction of telemetry reports that contain an error
function computeErrorRate (days, index, n) {
  if (index < n - 1) return null
  var total = 0
  var errored = 0
  for (var i = index - n + 1; i <= index; i++) {
    total += days[i].sessions.total
    errored += days[i].sessions.errored
  }
  return errored / total
}

// Finds the number of unique active users over the last n days
// ending with days[index]. Returns null if index < n - 1
function computeActives (days, index, n) {
  if (index < n - 1) return null
  var combined = {}
  for (var i = index - n + 1; i <= index; i++) {
    Object.assign(combined, days[i].uniqueUsers)
  }
  return Object.keys(combined).length
}

// Computes retention: the # of new users from some past day that used the
// app on this day.
function computeRetention (day, prevDay) {
  var combined = Object.assign({}, day.uniqueUsers, prevDay.uniqueUsers)
  var numCombined = Object.keys(combined).length
  var numToday = Object.keys(day.uniqueUsers).length
  var numPrev = Object.keys(prevDay.uniqueUsers).length
  var numLost = numCombined - numToday
  return (numPrev - numLost) / numPrev
}

// Loads all WebTorrent Desktop releases
// Callback: (err, [{tag_name, published_at}, ...])
function loadReleases (cb) {
  var opts = {
    url: 'https://api.github.com/repos/feross/webtorrent-desktop/releases',
    json: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }

  return new Promise(function (resolve, reject) {
    console.log('Fetching ' + opts.url)
    get.concat(opts, function (err, res, data) {
      if (err) return reject(err)
      console.log('Got ' + data.length + ' WebTorrent Desktop releases')
      var releases = data.map(function (d) {
        return {tag_name: d.tag_name, published_at: d.published_at}
      })
      resolve(releases)
    })
  })
}
