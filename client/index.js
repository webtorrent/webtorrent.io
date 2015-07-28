// View-specific code
var pathname = window.location.pathname
if (pathname === '/') require('./views/home')()
if (pathname === '/create') require('./views/create')()
