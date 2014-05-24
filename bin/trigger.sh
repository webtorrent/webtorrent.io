#!/bin/sh
# Trigger a deploy (run from CI server)

APP_DIR = /home/feross/www/webtorrent.io

ssh feross@future.feross.net -p 44444 $(APP_DIR)/bin/deploy.sh
