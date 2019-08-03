const basicAuth = require('basic-auth')

// Returns an HTTP handler that enforces basic auth.
// The handler will either return 401 Unauthorized or defer to the next handler.
// Takes a dictionary {user1: "password1", user2: "hunter2", ...}
module.exports = function (passwords) {
  return function (req, res, next) {
    const user = basicAuth(req)

    if (user && user.pass && passwords[user.name] === user.pass) {
      console.log('Basic auth granted: %s can access %s', user.name, req.url)
      next()
    } else {
      res.setHeader('WWW-Authenticate', 'Basic realm=Authorization Required')
      res.statusCode = 401
      res.end()
    }
  }
}
