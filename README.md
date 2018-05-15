# webtorrent.io [![travis][travis-image]][travis-url] [![javascript style guide][standard-image]][standard-url]

[travis-image]: https://img.shields.io/travis/webtorrent/webtorrent.io/master.svg
[travis-url]: https://travis-ci.org/webtorrent/webtorrent.io
[standard-image]: https://img.shields.io/badge/code_style-standard-brightgreen.svg
[standard-url]: https://standardjs.com

### The website for the [WebTorrent](https://webtorrent.io) project

## Developer Notes

- Requires Node.js v8.0.0 or newer
- `secret/index.js` will need to be created locally (copy `secret/index-sample.js`).

### Log folders

For production, the following folders are required to exist with chmod `777`.
- $HOME/www/log/webtorrent.io/crash-reports
- $HOME/www/log/webtorrent.io/telemetry

For local development (not using `NODE_ENV="production"` environment variable), these folders will be created at:

- *(application root)*/logs/crash-reports
- *(application root)*/logs/telemetry

## license

MIT. Copyright (c) [WebTorrent, LLC](https://webtorrent.io).
