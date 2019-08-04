// View-specific code
const pathname = window.location.pathname
if (pathname === '/') require('./views/home')()
if (/\/desktop\/?/.test(pathname)) require('./views/desktop')()
