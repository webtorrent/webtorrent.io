# webtorrent-www [![travis][travis-image]][travis-url]

[travis-image]: https://img.shields.io/travis/feross/webtorrent-www/master.svg
[travis-url]: https://travis-ci.org/feross/webtorrent-www

### The website for the [WebTorrent](https://webtorrent.io) project

## Developer Notes

- Requires Node.js v6.0.0 or newer
- `secret/index.js` will need to be created locally (copy `secret/index-sample.js`).

### Log folders

For production, the following folders are required to exist with chmod `777`.
- $HOME/www/log/webtorrent.io/crash-reports
- $HOME/www/log/webtorrent.io/telemetry

For local development (not using `NODE_ENV="production"` environment variable), these folders will be created at:

- *(application root)*/logs/crash-reports
- *(application root)*/logs/telemetry

## license

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org).
