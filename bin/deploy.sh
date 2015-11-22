#!/bin/bash
# Update code and restart server (run from app server)
trap 'exit' ERR

if [ -d "/home/feross/www/webtorrent.io-build" ]; then
  echo "ERROR: Build folder already exists. Is another build in progress?"
  exit 1
fi

cp -R /home/feross/www/webtorrent.io /home/feross/www/webtorrent.io-build

cd /home/feross/www/webtorrent.io-build && git pull
cd /home/feross/www/webtorrent.io-build && rm -rf node_modules
cd /home/feross/www/webtorrent.io-build && npm install --quiet
cd /home/feross/www/webtorrent.io-build && npm run build

sudo supervisorctl stop webtorrent

cd /home/feross/www && mv webtorrent.io webtorrent.io-old
cd /home/feross/www && mv webtorrent.io-build webtorrent.io

sudo supervisorctl start webtorrent

cd /home/feross/www && rm -rf webtorrent.io-old
