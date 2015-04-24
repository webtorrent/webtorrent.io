#!/bin/bash
# Update code and restart server (run from app server)
trap 'exit' ERR

sudo supervisorctl stop webtorrent
cd /home/feross/www/webtorrent.io && git pull
cd /home/feross/www/webtorrent.io && rm -rf node_modules
cd /home/feross/www/webtorrent.io && npm install --quiet
cd /home/feross/www/webtorrent.io && npm run build
sudo supervisorctl start webtorrent
