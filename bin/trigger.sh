#!/bin/sh
# Trigger a deploy (run from CI server)

ssh feross@webtorrent.feross.net -p 44444 /home/feross/www/webtorrent-website/bin/deploy.sh
