// View-specific code
var pathname = window.location.pathname
if (pathname === '/') require('./views/home')()
if (/\/create\/?/.test(pathname)) require('./views/create')()
if (/\/desktop\/?/.test(pathname)) require('./views/desktop')()
