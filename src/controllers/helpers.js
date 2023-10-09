import crypto from "crypto";

export function getPlayersCount(roomID) {
    return Object.keys(games[roomID]).filter((key) => key.length === 20).length;
};

export function randomId(size = 8) {
    return crypto.randomBytes(size).toString("hex").substring(0, size);
};

export function wait(roomID, owner, ms) {
    return new Promise((resolve, reject) => {
        round.on('everybodyGuessed', ({ roomID: callerRoomID }) => {
            if (callerRoomID === roomID) resolve();
        });
        owner.on('disconnect', (err) => reject(err));
        setTimeout(() => resolve(true), ms);
    });
};