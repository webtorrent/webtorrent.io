var PORT_80 = process.env === 'production' ? 80 : 9000

exports.ports = {
  router: PORT_80,
  web: 9001,
  tracker: {
    http: 9002,
    udp: PORT_80
  }
}
