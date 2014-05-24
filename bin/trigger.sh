# Trigger a deploy (run from CI server)

APP_DIR = /home/feross/www/webtorrent.io

ssh feross@future.feross.net -p 44444 make -f $(APP_DIR)/Makefile deploy
