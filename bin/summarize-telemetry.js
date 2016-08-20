#!/usr/bin/env node

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

    // Read them all and collect summary stats...
    loadSummary(logFiles).then(function (summary) {
      // Finally, write summary.json
      var summaryPath = path.join(TELEMETRY_PATH, 'summary.json')
      var summaryJSON = JSON.stringify(summary, null, 2) // pretty print
      fs.writeFile(summaryPath, summaryJSON, function (err) {
        if (err) die(err)
        console.log('Done!')
      })
    }, function (err) {
      die(err)
    })
  })
}

function die (err) {
  console.error(err)
  process.exit(1)
}

// Reads telemetry log files in parallel, then produces a summary array, one
// entry for each day: [{date, actives, retention, ...}, ...]
function loadSummary (logFiles) {
  console.log('Summarizing ' + logFiles.length + ' telemetry log files')
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
