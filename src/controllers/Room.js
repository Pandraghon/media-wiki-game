import { randomId } from "./helpers.js";

export default class Room {
    constructor(io, socket) {
        this.io = io;
        this.socket = socket;
    }

    createPrivateRoom(player) {
        const { socket } = this;
        const id = randomId(15);
        games[id] = {
            rounds: 2,
            time: 40 * 1000,
            wiki: 'enwiki'
        };
        games[id][socket.id] = {};
        games[id][socket.id].score = 0;
        games[id][socket.id].steps = [];
        games[id][socket.id].name = player.name;
        socket.player = player;
        socket.roomID = id;
        socket.join(id);
        socket.emit('newPrivateRoom', { gameID: id });
    }

    async joinRoom(data) {
        const { io, socket } = this;
        const roomID = data.id;
        const players = Array.from(await io.in(roomID).allSockets());
        console.log(players);
        console.log({roomID});
        console.log({socketID: socket.id});
        console.log({games});
        games[roomID][socket.id] = {};
        games[roomID][socket.id].score = 0;
        games[roomID][socket.id].steps = [];
        games[roomID][socket.id].name = data.player.name;
        socket.player = data.player;
        socket.join(roomID);
        socket.roomID = roomID;
        socket.to(roomID).emit('joinRoom', data.player);
        socket.emit('otherPlayers',
            players.reduce((acc, id) => {
                if (socket.id !== id) {
                    const { player } = io.of('/').sockets.get(id);
                    acc.push(player);
                }
                return acc;
            }, []));
    }

    updateSettings(data) {
        const { socket } = this;
        games[socket.roomID].time = Number(data.time) * 1000;
        games[socket.roomID].rounds = Number(data.rounds);
        games[socket.roomID].probability = Number(data.probability);
        games[socket.roomID].wiki = data.wiki;
        socket.to(socket.roomID).emit('settingsUpdate', data);
    }
};