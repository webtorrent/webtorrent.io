#!/bin/sh
# Trigger a deploy (run from CI server)

ssh feross@webtorrent.feross.net -p 44444 /home/feross/www/webtorrent.io/bin/deploy.sh
