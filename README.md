# webtorrent-www [![travis][travis-image]][travis-url]

[travis-image]: https://img.shields.io/travis/feross/webtorrent-www/master.svg
[travis-url]: https://travis-ci.org/feross/webtorrent-www

### The website for the [WebTorrent](https://webtorrent.io) project

## Developer Notes

- node v6 is required
- `secret\index.js` will need to be created locally (copy `secret\index-sample.js`).

### Log folders

For production, the following folders are required to exist with chmod `777`.
- $HOME/www/log/webtorrent.io/crash-reports
- $HOME/www/log/webtorrent.io/telemetry

For local development (not using `--production` flag), these folders will be created at
- *(application root)*/logs/crash-reports
- *(application root)*/logs/telemetry

## license

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org).
