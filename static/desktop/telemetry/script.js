var nv = window.nv
var d3 = window.d3
var summary = window.summary

var dataActives = ['today', 'day7', 'day30'].map(function (key) {
  var values = summary.telemetry.map(function (day) {
    return {
      x: new Date(day.date).getTime(),
      y: day.actives[key]
    }
  })
  return {key, values}
})

var dataInstalls = [{
  key: 'new users',
  values: summary.telemetry.map(function (day) {
    return {
      x: new Date(day.date).getTime(),
      y: day.installs
    }
  })
}]

var dataRetention = ['day1', 'day7', 'day28'].map(function (key) {
  var values = summary.telemetry.map(function (day) {
    return {
      x: new Date(day.date).getTime(),
      y: day.retention[key]
    }
  })
  return {key, values}
})

var chartInfos = [{
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
}]

var dateScale = d3.time.scale()
var dateFormat = function (t) {
  return d3.time.format.utc('%Y-%m-%d')(new Date(t))
}

window.addEventListener('DOMContentLoaded', function () {
  console.log('Graphing...')

  window.charts = chartInfos.map(function (info, i) {
    var chart = nv.models.lineWithFocusChart()

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

// Draw a red line at each event (eg, new release of the app)
function updateEvents (chart, i) {
  var xDomain = chart.xAxis.domain()
  var yDomain = chart.yAxis.domain()
  var events = summary.releases.map(function (release) {
    return {
      t: new Date(release.published_at).getTime(),
      name: release.tag_name
    }
  })
  events = events.filter(function (release) {
    return release.t > xDomain[0] && release.t < xDomain[1]
  })

  // First, draw the lines
  var yPixels = yDomain.map(chart.yAxis.scale())
  var xScale = function (event) {
    return chart.xAxis.scale()(event.t)
  }

  var container = d3.select(chartInfos[i].selector + ' .nv-interactive')

  var sel = container
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
  var textXScale = function (event) {
    return xScale(event) + 2
  }

  sel = container
    .selectAll('text.event')
    .data(events)

  sel.enter()
    .append('text')
    .attr('class', 'event')

  sel.attr('x', textXScale)
    .attr('y', 12)
    .text(function (event) { return event.name })

  sel.exit()
    .remove()
}
