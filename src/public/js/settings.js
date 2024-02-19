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
    console.log('update');
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

socket.on('wikiAlreadyExists', (data) => {
    console.log('Wiki already exists');
    const { wikiid } = data;
    const el = document.querySelector('#wiki');
    el.value = wikiid;
    el.dispatchEvent(new Event('change'));
});

socket.on('newWikiAdded', (data) => {
    console.log('Wiki added');
    const { wikiData } = data;
    const el = document.querySelector('#wiki');

    wikis.push(wikiData);
    const wikiOption = document.createElement('option');
    Object.assign(wikiOption, {
        value: wikiData.wikiid,
        textContent: `${wikiData.sitename} (${wikiData.lang})`
    });
    el.append(wikiOption);
    if (!searchParams.has('id')) {
        el.value = wikiData.wikiid;
        el.dispatchEvent(new Event('change'));
    }
});

if (playerName) {
    playerName.focus();
}

if (searchParams.has('id')) {
    // player
    document.querySelector('#rounds').setAttribute('disabled', true);
    document.querySelector('#time').setAttribute('disabled', true);
    document.querySelector('#wiki').setAttribute('disabled', true);
    document.querySelector('#newWiki').setAttribute('disabled', true);
    document.querySelector('#sendNewWiki').setAttribute('disabled', true);
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

document.querySelector('#sendNewWiki').addEventListener('click', async () => {
    const newWiki = document.getElementById('newWiki').value;
    console.log(`Sending a new wiki for ${newWiki}`);
    const newWikiURL = new URL(newWiki);
    const wikiData = await fetch(`${newWikiURL.origin}/w/api.php?action=query&meta=siteinfo&formatversion=2&format=json&origin=*`, {
        Accept: 'application/json',
        'Content-Type': 'application/json'
    })
    .then(res => res.json())
    .then(res => {
        const data = res.query.general;
        return {
            wikiid: data.wikiid,
            sitename: data.sitename,
            mainpage: data.mainpage,
            server: data.server,
            articlepath: data.articlepath,
            scriptpath: data.scriptpath,
            logo: data.logo,
            favicon: data.favicon,
            lang: data.lang
        };
    }).catch(async err => {
        console.error(err);
        return await fetch(`${newWikiURL.origin}/api.php?action=query&meta=siteinfo&formatversion=2&format=json&origin=*`, {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        })
        .then(res => res.json())
        .then(res => {
            const data = res.query.general;
            return {
                wikiid: data.wikiid,
                sitename: data.sitename,
                mainpage: data.mainpage,
                server: data.server,
                articlepath: data.articlepath,
                scriptpath: data.scriptpath,
                logo: data.logo,
                favicon: data.favicon,
                lang: data.lang
            };
        });
    });
    socket.emit('sendNewWiki', { wiki: wikiData });
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

socket.on('restartGame', () => {
    document.getElementById('scores_round').hidden = true;
    document.querySelector('#game_zone').hidden = true;
    document.querySelector('#game_ended').hidden = true;
    document.getElementById('closeRoom').hidden = true;
    document.querySelector('#historic').hidden = true;
    document.querySelector('#current_page').hidden = true;
    document.getElementById('page_selector').hidden = true;
    document.getElementById('pages_selecting').hidden = true;
    document.getElementById('pages_selected').hidden = true;

    document.querySelector('#settings').hidden = false;
});
