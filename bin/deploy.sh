#!/bin/sh
# Update code and restart server (run from app server)

cd /home/feross/www/webtorrent.io && git pull
cd /home/feross/www/webtorrent.io && npm update --quiet
# cd $(APP_DIR) && npm run build
sudo supervisorctl reload && sleep 3 && sudo supervisorctl restart webtorrent
