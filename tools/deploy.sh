#!/bin/bash
# Update code and restart server (run on server)
set -e

if [ -d "/home/feross/www/build-webtorrent.io" ]; then
  echo "ERROR: Build folder exists. Is another build in progress?"
  exit 1
fi

if [ -d "/home/feross/www/old-webtorrent.io" ]; then
  echo "ERROR: Old folder exists. Did a previous build crash?"
  exit 1
fi

cp -R /home/feross/www/webtorrent.io /home/feross/www/build-webtorrent.io

cd /home/feross/www/build-webtorrent.io && git pull
cd /home/feross/www/build-webtorrent.io && rm -rf node_modules
cd /home/feross/www/build-webtorrent.io && npm ci --no-progress
cd /home/feross/www/build-webtorrent.io && npm run build --if-present
cd /home/feross/www/build-webtorrent.io && npm prune --production --no-progress

sudo supervisorctl stop webtorrent

cd /home/feross/www && mv webtorrent.io old-webtorrent.io
cd /home/feross/www && mv build-webtorrent.io webtorrent.io

sudo supervisorctl start webtorrent

cd /home/feross/www && rm -rf old-webtorrent.io
