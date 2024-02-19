import { randomId } from "./helpers.js";
import fetch from 'node-fetch';

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

    async restartGame() {
        const { io, socket } = this;
        Array.from(await io.in(socket.roomID).allSockets()).forEach(playerID => {
            if (playerID in games[socket.roomID]) Object.assign(games[socket.roomID][playerID], {
                score: 0,
            });
        });
        io.to(socket.roomID).emit('restartGame');
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

    async createWiki(data) {
        console.log(`Creating a new wiki for ${data.wiki}`);
        const { io, socket } = this;
        const wikiData = data.wiki;
        const existing = await io.pgPool.query('SELECT count(*) FROM game.wiki where wikiid = $1', [wikiData.wikiid]);
        if (existing.rows[0].count > 0) {
            console.log(`Already exists ${wikiData.wikiid}`);
            return socket.emit('wikiAlreadyExists', { wikiid: wikiData.wikiid });
        }

        const created = await io.pgPool.query('INSERT INTO game.wiki (wikiid, sitename, mainpage, server, articlepath, scriptpath, logo, favicon, lang) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [wikiData.wikiid, wikiData.sitename, wikiData.mainpage, wikiData.server, wikiData.articlepath, wikiData.scriptpath, wikiData.logo, wikiData.favicon, wikiData.lang]);

        console.log(`Created ${wikiData}`);
        io.to(socket.roomID).emit('newWikiAdded', { wikiData });
    }
};