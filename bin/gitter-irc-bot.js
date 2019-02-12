#!/usr/bin/env node

const config = require('../config')
const gitterBot = require('gitter-irc-bot')

gitterBot(config.gitterBot)
