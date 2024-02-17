import { Server } from 'socket.io';
import { randomId } from './controllers/helpers.js';
//import { instrument } from '@socket.io/admin-ui';

import Room from './controllers/Room.js';
import Disconnect from './controllers/Disconnect.js';
import Game from './controllers/Game.js';

export default function init(server) {
    const io = new Server(server);
    io.pgPool = server.pgPool;

    io.of("/").adapter.on("create-room", (room) => {
        console.log(`room ${room} was created`);
    });

    io.of("/").adapter.on("join-room", (room, id) => {
        console.log(`socket ${id} has joined room ${room}`);
    });

    io.on('connection', (socket) => {
        console.log('connected user');
        socket.on('newPrivateRoom', (player) => new Room(io, socket).createPrivateRoom(player));
        socket.on('joinRoom', async (data) => { await new Room(io, socket).joinRoom(data); });
        socket.on('settingsUpdate', (data) => new Room(io, socket).updateSettings(data));
        socket.on('sendNewWiki', async (data) => { await new Room(io, socket).createWiki(data); });
        socket.on('startGame', async () => { await new Game(io, socket).startGame(); });
        socket.on('getPlayers', async () => { await new Game(io, socket).getPlayers(); });
        socket.on('navigation', (data) => new Game(io, socket).onNavigation(data));
        socket.on('disconnect', () => new Disconnect(io, socket).onDisconnect());
    });
};