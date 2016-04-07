#!/usr/bin/env node

var config = require('../config')
var gitterBot = require('gitter-irc-bot')

gitterBot(config.gitterBot)
