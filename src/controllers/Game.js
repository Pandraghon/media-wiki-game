import { wait } from "./helpers.js";

export default class Game {
    constructor(io, socket) {
        this.io = io;
        this.socket = socket;
    }

    chosenWord(playerID) {
        const { io } = this;
        return new Promise((resolve, reject) => {
            function rejection(err) { reject(err); }
            const socket = io.of('/').sockets.get(playerID);
            socket.on('choosePages', ({ start, end }) => {
                io.to(socket.roomID).emit('showPages', { start, end, wiki: games[socket.roomID].wiki });
                socket.removeListener('disconnect', rejection);
                resolve({ start, end });
            });
            socket.once('disconnect', rejection);
        });
    }

    resetGuessedFlag(players) {
        const { io, socket } = this;
        players.forEach((playerID) => {
            if (playerID in games[socket.roomID]) Object.assign(games[socket.roomID][playerID], {
                hasFound: false,
                steps: []
            });
            console.log(games[socket.roomID][playerID]);
        });
    }

    async startGame() {
        const { io, socket } = this;
        const { rounds } = games[socket.roomID];
        const players = Array.from(await io.in(socket.roomID).allSockets());
        io.to(socket.roomID).emit('startGame');
        for (let j = 0; j < rounds; j++) {
            /* eslint-disable no-await-in-loop */
            for (let i = 0; i < players.length; i++) {
                const turn = j * players.length + i + 1;
                await this.giveTurnTo(players, i, turn);
            }
        }
        io.to(socket.roomID).emit('endGame', { stats: games[socket.roomID] });
        delete games[socket.roomID];
    }

    async giveTurnTo(players, i, turn) {
        const { io, socket } = this;
        const { roomID } = socket;
        console.log('giveTurnTo', games, roomID);
        if (!games[roomID]) return;
        const { time } = games[roomID];
        const player = players[i];
        const prevPlayer = players[(i - 1 + players.length) % players.length];
        const chooser = io.of('/').sockets.get(player);
        if (!chooser || !games[roomID]) return;
        this.resetGuessedFlag(players);
        games[roomID].totalGuesses = 0;
        games[roomID].currentWord = '';
        games[roomID].startPage = '';
        games[roomID].endPage = '';
        games[roomID].chooser = player;
        io.to(prevPlayer).emit('disableCanvas');
        chooser.to(roomID).emit('choosing', { name: chooser.player.name, turn });
        io.to(player).emit('choosePages', { wikiid: games[roomID].wiki, turn });
        try {
            const { start, end } = await this.chosenWord(player);
            games[roomID].startPage = start;
            games[roomID].endPage = end;
            games[roomID].startTime = Date.now() / 1000;
            io.to(roomID).emit('startTimer', { time });
            if (await wait(roomID, chooser, time)) console.log('ended');
        } catch (error) {
            console.log(error);
        }
    }

    onNavigation(data) {
        const { io, socket } = this;
        const { page } = data;
        console.log('onNavigation', data);
        console.log('room', games[socket.roomID]);
        if (!games[socket.roomID]) return;
        const { endPage } = games[socket.roomID];
        const { steps } = games[socket.roomID][socket.id];
        const roomSize = io.sockets.adapter.rooms.get(socket.roomID).size;
        console.log(endPage, steps, page);
        if (steps && steps[steps.length - 1] === page) return; // already on this page
        if (steps && steps[steps.length - 1] === endPage.title) return; // already won
        steps.push(page);
        io.emit('updateSteps', { playerID: socket.id, steps, won: page === endPage.title });
        if (page === endPage.title) {
            games[socket.roomID][socket.id].hasFound = true;
            games[socket.roomID][socket.id].score += 1;
            games[socket.roomID].totalGuesses++;
            socket.emit('reachEndPage');

            if (games[socket.roomID].totalGuesses === roomSize - 1) {
                round.emit('everybodyGuessed', { roomID: socket.roomID });
            }
        }
    }

    onMessage(data) {
        const { io, socket } = this;
        const guess = data.message.toLowerCase().trim();
        if (guess === '') return;
        const currentWord = games[socket.roomID].currentWord.toLowerCase();
        const distance = leven(guess, currentWord);
        if (distance === 0 && currentWord !== '') {
            socket.emit('message', { ...data, name: socket.player.name });
            if (games[socket.roomID].chooser !== socket.id && !socket.hasGuessed) {
                const chooser = io.of('/').sockets.get(games[socket.roomID].chooser);
                const { startTime } = games[socket.roomID];
                const roundTime = games[socket.roomID].time;
                const roomSize = io.sockets.adapter.rooms.get(socket.roomID).size;
                socket.emit('correctGuess', { message: 'You guessed it right!', id: socket.id });
                socket.broadcast.emit('correctGuess', { message: `${socket.player.name} has guessed the word!`, id: socket.id });
                games[socket.roomID].totalGuesses++;
                games[socket.roomID][socket.id].score += getScore(startTime, roundTime);
                games[socket.roomID][chooser.id].score += BONUS;
                io.in(socket.roomID).emit('updateScore', {
                    playerID: socket.id,
                    score: games[socket.roomID][socket.id].score,
                    chooserID: chooser.id,
                    chooserScore: games[socket.roomID][chooser.id].score,
                });
                if (games[socket.roomID].totalGuesses === roomSize - 1) {
                    round.emit('everybodyGuessed', { roomID: socket.roomID });
                }
            }
            socket.hasGuessed = true;
        } else if (distance < 3 && currentWord !== '') {
            io.in(socket.roomID).emit('message', { ...data, name: socket.player.name });
            if (games[socket.roomID].chooser !== socket.id && !socket.hasGuessed) socket.emit('closeGuess', { message: 'That was very close!' });
        } else {
            io.in(socket.roomID).emit('message', { ...data, name: socket.player.name });
        }
    }

    async getPlayers() {
        const { io, socket } = this;
        const players = Array.from(await io.in(socket.roomID).allSockets());
        io.in(socket.roomID).emit('getPlayers', {
            players: players.reduce((acc, id) => {
                const { player } = io.of('/').sockets.get(id);
                acc.push(player);
                return acc;
            }, []),
            wikiid: games[socket.roomID].wiki
        });
    }
};