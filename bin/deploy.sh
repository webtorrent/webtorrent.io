#!/bin/sh
# Update code and restart server (run from app server)
set -e
cd /home/feross/www/webtorrent.io && git pull
cd /home/feross/www/webtorrent.io && rm -rf node_modules
cd /home/feross/www/webtorrent.io && npm install --quiet
cd /home/feross/www/webtorrent.io && npm run build
sudo supervisorctl reload && sleep 3 && sudo supervisorctl restart webtorrent
