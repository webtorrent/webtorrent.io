# webtorrent.io [![github][github-image]][github-url] [![javascript style guide][standard-image]][standard-url]

[github-image]: https://img.shields.io/github/workflow/status/webtorrent/webtorrent.io/ci/master
[github-url]: https://github.com/webtorrent/webtorrent.io/actions
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
