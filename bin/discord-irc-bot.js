#!/usr/bin/env node

const config = require('../config')
const discordIrc = require('discord-irc').default

discordIrc(config.discordIrc)
