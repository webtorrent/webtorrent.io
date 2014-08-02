var PORT_80 = process.env.NODE_ENV === 'production' ? 80 : 9000

exports.ports = {
  router: PORT_80,
  web: 9001,
  tracker: {
    http: 9002,
    udp: PORT_80
  },
  instant: 9100 // instant.io
}
