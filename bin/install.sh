#!/bin/sh
set -e

if [[ -d "$HOME/www/log/webtorrent.io" ]] ; then
  mkdir -p $HOME/www/log/webtorrent.io/crash-reports
  chmod 777 $HOME/www/log/webtorrent.io/crash-reports

  mkdir -p $HOME/www/log/webtorrent.io/telemetry
  chmod 777 $HOME/www/log/webtorrent.io/telemetry
fi
