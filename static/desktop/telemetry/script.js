const nv = window.nv
const d3 = window.d3
const summary = window.summary
const versions = window.versions

// Don't include partial data from today
const telemetry = summary.telemetry.slice(0, summary.telemetry.length - 1)
const yesterday = telemetry[telemetry.length - 1]

function getValues (fn) {
  return telemetry.filter(fn).map(function (day) {
    return {
      x: getEndOfDay(day.date),
      y: fn(day)
    }
  })
}

const dataActives = ['today', 'last7', 'last30'].map(function (key) {
  const values = getValues(function (day) { return day.actives[key] })
  return { key, values }
})

const dataInstalls = [{
  key: 'new users',
  values: getValues(function (day) { return day.installs })
}]

const dataRetention = ['day1', 'day7', 'day28', 'day30to60'].map(function (key) {
  const values = getValues(function (day) { return day.retention[key] })
  return { key, values }
})

const dataErrors = ['last7', 'today', 'today-latest'].map(function (key) {
  const values = getValues(function (day) { return day.errorRates[key] })
  return { key, values }
})

const versionColors = [
  '#1f77b4',
  '#fdae61',
  '#f46d43',
  '#d73027',
  '#a50026'
]
const dataVersions = versions.map(function (key, i) {
  const values = telemetry.map(function (day) {
    return {
      x: getEndOfDay(day.date),
      y: (day.usage.version[key] || 0) / day.actives.today
    }
  })
  const color = versionColors[Math.min(versions.length - i - 1, 6)]
  return { key, values, color }
})

const dataVersionPlatform = []
const platforms = ['win32', 'darwin', 'linux']
const platformColors = {
  linux: [
    '#fee5d9',
    '#fcae91',
    '#fb6a4a',
    '#de2d26',
    '#a50f15'
  ],
  darwin: [
    '#edf8e9',
    '#bae4b3',
    '#74c476',
    '#31a354',
    '#006d2c'
  ],
  win32: [
    '#eff3ff',
    '#bdd7e7',
    '#6baed6',
    '#3182bd',
    '#08519c'
  ]
}
platforms.forEach(function (platform) {
  versions.forEach(function (version, i) {
    const n = versions.length
    const versionIndex = n - i < 2
      ? (5 + i - n) // latest two releases: darkest colors
      : (i + n + 2) % 3 // all previous releases: cycle lighter colors
    const color = platformColors[platform][versionIndex]
    const key = version + '-' + platform
    const value = yesterday.usage.versionPlatform[key]
    dataVersionPlatform.push({ key, value, color })
  })
})

const chartInfos = [{
  selector: '#chart-actives',
  data: dataActives,
  yFormat: d3.format(',.0f')
}, {
  selector: '#chart-installs',
  data: dataInstalls,
  yFormat: d3.format(',.0f')
}, {
  selector: '#chart-retention',
  data: dataRetention,
  yFormat: d3.format(',.2f')
}, {
  selector: '#chart-error-rate',
  data: dataErrors,
  yFormat: d3.format(',.2f')
}, {
  selector: '#chart-versions',
  data: dataVersions,
  yFormat: d3.format(',.2f')
}]

const dateScale = d3.time.scale.utc()
const dateFormat = function (t) {
  return d3.time.format.utc('%Y-%m-%d')(new Date(t))
}

window.addEventListener('DOMContentLoaded', function () {
  console.log('Graphing...')

  window.charts = chartInfos.map(function (info, i) {
    const chart = nv.models.lineWithFocusChart()

    chart.xAxis
      .scale(dateScale)
      .tickFormat(dateFormat)

    chart.x2Axis
      .scale(dateScale)
      .tickFormat(dateFormat)

    chart.yAxis
      .tickFormat(info.yFormat)

    d3.select(info.selector)
      .datum(info.data)
      .transition().duration(500)
      .call(chart)

    updateEvents(chart, i)
    chart.focus.dispatch.on('brush', function (e) {
      setTimeout(() => updateEvents(chart, i), 0)
    })

    return chart
  })

  nv.utils.windowResize(updateAll)
})

function updateAll () {
  window.charts.forEach(function (chart, i) {
    chart.update()
    updateEvents(chart, i)
  })
}

function getEndOfDay (date) {
  return new Date(date + 'T23:59:59Z').getTime()
}

// Draw a red line at each event (eg, new release of the app)
function updateEvents (chart, i) {
  // First, update the date range
  const xDomain = chart.xAxis.domain()
  const yDomain = chart.yAxis.domain()
  const events = summary.releases.map(function (release) {
    return {
      t: new Date(release.published_at).getTime(),
      name: release.tag_name
    }
  }).filter(function (release) {
    return release.t >= xDomain[0] && release.t <= xDomain[1]
  })

  // Then, draw the ticks, at most one per day
  const numDays = (xDomain[1] - xDomain[0]) / 24 / 3600 / 1000
  chart.xAxis.ticks(Math.min(10, numDays))

  // First, draw the lines
  const yPixels = yDomain.map(chart.yAxis.scale())
  const xScale = function (event) {
    return chart.xAxis.scale()(event.t)
  }

  const container = d3.select(chartInfos[i].selector + ' .nv-interactive')

  let sel = container
    .selectAll('line.event')
    .data(events)

  sel.enter()
    .append('line')
    .attr('class', 'event')

  sel.attr('x1', xScale)
    .attr('x2', xScale)
    .attr('y1', yPixels[0])
    .attr('y2', yPixels[1])

  sel.exit()
    .remove()

  // Then, draw labels
  const textXScale = function (event) {
    return xScale(event) - 2
  }

  sel = container
    .selectAll('text.event')
    .data(events)

  sel.enter()
    .append('text')
    .attr('class', 'event')
    .attr('text-anchor', 'end')

  const ys = []
  const yoffset = 15
  ys[events.length - 1] = yoffset
  for (let j = events.length - 2; j >= 0; j--) {
    ys[j] = textXScale(events[j]) - textXScale(events[j + 1]) < 40
      ? ys[j + 1] + yoffset
      : yoffset
  }
  sel.attr('x', textXScale)
    .attr('y', function (_, i) { return ys[i] })
    .text(function (event) { return event.name })

  sel.exit()
    .remove()
}

// Add event handlers to the errors tables
const checkbox = document.querySelector('#latest-only')
checkbox.addEventListener('change', onCheck)
onCheck()
function onCheck (e) {
  const $stacktraces = Array.from(document.querySelectorAll('.error-stacktrace'))
  $stacktraces.forEach(function ($elem) {
    $elem.classList.remove('visible')
  })
  const showId = checkbox.checked ? 'errors-latest' : 'errors-all'
  const hideId = checkbox.checked ? 'errors-all' : 'errors-latest'
  document.querySelector('#' + showId).classList.add('visible')
  document.querySelector('#' + hideId).classList.remove('visible')
}

const rows = document.querySelectorAll('.error-row')
Array.prototype.forEach.call(rows, function (row) {
  const stackElem = row.querySelector('.error-stacktrace')
  const summaryElem = row.querySelector('.error-summary')
  summaryElem.addEventListener('click', function (e) {
    stackElem.classList.toggle('visible')
  })
})
