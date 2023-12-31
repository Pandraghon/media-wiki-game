const socket = io();
const params = window.location.toString().substring(window.location.toString().indexOf('?'));
const searchParams = new URLSearchParams(params);
const copyBtn = document.querySelector('#copy');
let language = 'English';
const playerName = document.querySelector('#playerName');
const my = {
    name: localStorage.getItem('name') || '',
};

function updateSettings(e) {
    e.preventDefault();
    socket.emit('settingsUpdate', {
        rounds: document.querySelector('#rounds').value,
        time: document.querySelector('#time').value,
        wiki: document.querySelector('#wiki').value,
    });
}

function putPlayer(player) {
    const playerCard = new PlayerCard();
    playerCard.id = `player-${player.id}`;
    playerCard.setAttribute('name', player.name);
    document.querySelector('#playersDiv').appendChild(playerCard);
}

socket.on('joinRoom', putPlayer);
socket.on('otherPlayers', (players) => players.forEach((player) => putPlayer(player)));
socket.on('disconnection', async (player) => {
    if (document.querySelector(`#player-${player.id}`)) {
        document.querySelector(`#player-${player.id}`).remove();
    }
});
socket.on('startGame', () => {
    document.querySelector('#settings').hidden = true;
    const gameZone = document.getElementById('game_zone');
    gameZone.hidden = false;
});

if (playerName) {
    playerName.focus();
}

if (searchParams.has('id')) {
    // player
    document.querySelector('#rounds').setAttribute('disabled', true);
    document.querySelector('#time').setAttribute('disabled', true);
    document.querySelector('#wiki').setAttribute('disabled', true);
    document.querySelector('#startGame').setAttribute('disabled', true);
} else {
    // room owner
    document.querySelector('#rounds').addEventListener('input', updateSettings);
    document.querySelector('#time').addEventListener('input', updateSettings);
    document.querySelector('#wiki').addEventListener('change', updateSettings);
}

document.querySelector('#landing-form').addEventListener('submit', async () => {
    const isRoomOwner = document.querySelector('#landingAction').value === 'createRoom';
    document.querySelector('#landing').remove();
    document.querySelector('#settings').classList.remove('d-none');
    document.querySelector('#settings').hidden = false;
    document.querySelector('#players').hidden = false;
    my.id = socket.id;
    my.name = playerName.value;
    localStorage.setItem('name', playerName.value);
    if (isRoomOwner) {
        socket.emit('newPrivateRoom', my);
        socket.on('newPrivateRoom', (data) => {
            document.querySelector('#gameLink').value = `${window.location.protocol}//${window.location.host}/?id=${data.gameID}`;
            putPlayer(my);
        });
    } else {
        if (searchParams.has('id')) {
            document.querySelector('#gameLink').value = `${window.location.protocol}//${window.location.host}/?id=${searchParams.get('id')}`;
            putPlayer(my);
        }
        socket.emit('joinRoom', { id: searchParams.get('id'), player: my });
    }
});

copyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('#gameLink').select();
    document.execCommand('copy');
});

document.querySelector('#startGame').addEventListener('click', async () => {
    const gameZone = document.getElementById('game_zone');
    gameZone.hidden = false;
    socket.emit('startGame');
    socket.emit('getPlayers');
});

window.onload = () => {
    if (localStorage.getItem('name')) playerName.setAttribute('value', localStorage.getItem('name'));

    const wikiSelect = document.querySelector('#wiki');
    for (let i = 0, imax = wikis.length ; i < imax ; i++) {
        const wiki = wikis[i];
        const wikiOption = document.createElement('option');
        Object.assign(wikiOption, {
            value: wiki.wikiid,
            textContent: `${wiki.sitename} (${wiki.lang})`
        });
        wikiSelect.append(wikiOption);
    }
};