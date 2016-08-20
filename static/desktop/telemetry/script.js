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

  var charts = window.charts = chartInfos.map(function (info, i) {
    var chart = i === 1
      ? nv.models.lineWithFocusChart()
      : nv.models.lineChart()

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

    return chart
  })

  updateEvents()

  nv.utils.windowResize(updateAll)

  charts[1].focus.dispatch.on('brush', function (e) {
    charts[0].xDomain(e.extent).update()
    setTimeout(updateEvents, 0)
  })
})

function updateAll () {
  window.charts.forEach(function (chart, i) {
    chart.update()
  })
  updateEvents()
}

function updateEvents () {
  window.charts.forEach(function (chart, i) {
    // Then, draw a red line at each event (eg, new release of the app)
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
    var scale = function (event) {
      return chart.xAxis.scale()(event.t)
    }

    // First, draw the lines
    var container = d3.select(chartInfos[i].selector + ' .nv-interactive')
    var yPixels = yDomain.map(chart.yAxis.scale())
    var sel = container
      .selectAll('line.event')
      .data(events)
      .attr('x1', scale)
      .attr('x2', scale)
      .attr('y1', yPixels[0])
      .attr('y2', yPixels[1])
    sel.enter()
      .append('line')
      .attr('class', 'event')
      .attr('x1', scale)
      .attr('x2', scale)
      .attr('y1', yPixels[0])
      .attr('y2', yPixels[1])
      .style('stroke', '#faa')
    sel.exit()
      .remove()

    // Then, draw labels
    var sel = container
      .selectAll('text.event')
      .data(events)
      .attr('x', scale)
      .attr('y', 10)
      .text(function (event) { return event.name })
    sel.enter()
      .append('text')
      .attr('class', 'event')
      .attr('x', scale)
      .attr('y', 10)
      .style('fill', '#f88')
      .text(function (event) { return event.name })
    sel.exit()
      .remove()
  })
}
