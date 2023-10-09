#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { EventEmitter } from 'events';
import server from '../server.js';
import init from '../sockets.js';

global.round = new EventEmitter();
global.games = {};

server.listen(process.env.PORT || 3000, () => {
    console.log(`Server listening on port ${server.address().port}`);
});

init(server);