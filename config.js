var PORT_80 = process.env.NODE_ENV === 'production' ? 80 : 9080
var PORT_443 = process.env.NODE_ENV === 'production' ? 80 : 9443

exports.ports = {
  router: {
    http: PORT_80,
    https: PORT_443
  },
  web: 9001,
  tracker: {
    http: 9002,
    udp: PORT_80
  },
  instant: 9100 // instant.io
}
