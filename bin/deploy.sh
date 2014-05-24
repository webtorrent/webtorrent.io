#!/bin/sh
# Update code and restart server (run from app server)

APP_DIR = /home/feross/www/webtorrent.io

cd $(APP_DIR) && git pull
cd $(APP_DIR) && npm update --quiet
# cd $(APP_DIR) && npm run build
sudo supervisorctl reload && sleep 3 && sudo supervisorctl restart webtorrent.io
