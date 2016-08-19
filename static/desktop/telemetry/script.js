var nv = window.nv
var d3 = window.d3
var summary = window.summary

var dataActives = ['today', 'day7', 'day30'].map(function (key) {
  var values = summary.map(function (day) {
    return {
      x: new Date(day.date).getTime(),
      y: day.actives[key]
    }
  })
  return {key, values}
})

var dataRetention = ['day1', 'day7', 'day28'].map(function (key) {
  var values = summary.map(function (day) {
    return {
      x: new Date(day.date).getTime(),
      y: day.retention[key]
    }
  })
  return {key, values}
})

var charts = [{
  selector: '#chart-actives',
  data: dataActives,
  yFormat: d3.format(',.0f')
}, {
  selector: '#chart-retention',
  data: dataRetention,
  yFormat: d3.format(',.2f')
}]

window.addEventListener('DOMContentLoaded', function () {
  console.log('Graphing...')

  charts.forEach(function (info) {
    nv.addGraph(function () {
      var chart = nv.models.lineWithFocusChart()

      var dateScale = d3.time.scale()
      var dateFormat = function (t) {
        return d3.time.format.utc('%Y-%m-%d')(new Date(t))
      }

      chart.xAxis
        .scale(dateScale)
        .tickFormat(dateFormat)

      chart.x2Axis
        .scale(dateScale)
        .tickFormat(dateFormat)

      chart.yAxis
        .tickFormat(info.yFormat)

      chart.y2Axis
        .tickFormat(info.yFormat)

      d3.select(info.selector)
        .datum(info.data)
        .transition().duration(500)
        .call(chart)

      nv.utils.windowResize(chart.update)

      return chart
    })
  })
})
