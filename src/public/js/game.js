/* global socket, pad, Howl, language */
let timerID = 0;
let pickWordID = 0;
let hints = [];
let currentWiki = false;

function createPlayerCard(players, wikiid) {
    players.forEach((player) => {
        /*const playerCard = new PlayerCard();
        playerCard.id = `player-${player.id}`;
        playerCard.setAttribute('name', player.name);
        document.querySelector('.players').append(playerCard);*/

        const playerScore = new PlayerScore();
        playerScore.id = `player-score-${player.id}`;
        playerScore.setAttribute('name', player.name);
        playerScore.setAttribute('wikiid', wikiid);
        document.querySelector('.players-scores').append(playerScore);
    });
}

function startTimer(ms) {
    let secs = ms / 1000;
    const id = setInterval((function updateClock() {
        const wordP = document.querySelector('#wordDiv > p.lead.fw-bold.mb-0');
        if (secs === 0) clearInterval(id);
        document.querySelector('#clock').textContent = secs;
        if (hints[0] && wordP && secs === hints[0].displayTime && pad.readOnly) {
            wordP.textContent = hints[0].hint;
            hints.shift();
        }
        secs--;
        return updateClock;
    }()), 1000);
    timerID = id;
    document.querySelectorAll('.players .correct').forEach((player) => player.classList.remove('correct'));
}

socket.on('getPlayers', ({players, wikiid}) => createPlayerCard(players, wikiid));
socket.on('updateSteps', ({ playerID, steps, won }) => {
    document.querySelector(`#player-${playerID}`).steps = steps.length;
    document.querySelector(`#player-${playerID}`).classList.toggle('finished', won);
    document.querySelector(`#player-score-${playerID}`).steps = steps;
    if (playerID === socket.id) {
        document.querySelector('#current_historic').setAttribute('steps', JSON.stringify(steps));
    }
});
socket.on('updateScores', (players) => createPlayerCard(players));
socket.on('updateScore', ({
    playerID,
    score,
    chooserID,
    chooserScore,
}) => {
    document.querySelector(`#player-${playerID}>div p:last-child`).textContent = `Score: ${score}`;
    document.querySelector(`#player-${chooserID}>div p:last-child`).textContent = `Score: ${chooserScore}`;
});

socket.on('choosing', ({ name, turn }) => {
    document.getElementById('pages_selected').hidden = true;
    document.getElementById('current_page').hidden = true;
    if (turn != 1) {
        document.getElementById('scores_round').hidden = false;
    }
    const pagesSelecting = document.getElementById('pages_selecting');
    pagesSelecting.hidden = false;
    pagesSelecting.querySelector('.chooser').textContent = name;
    document.querySelector('#clock').textContent = 0;
    clearInterval(timerID);
    //clock.stop();
    window.scrollTo(0, 0);
});

socket.on('settingsUpdate', (data) => {
    document.querySelector('#rounds').value = data.rounds;
    document.querySelector('#time').value = data.time;
    document.querySelector('#wiki').value = data.wiki;
});

socket.on('hints', (data) => { hints = data; });

socket.on('choosePages', async ({ wikiid, turn }) => {
    const wiki = wikis.find(w => w.wikiid == wikiid);
    currentWiki = wiki;
    console.log(wiki);
    const pageSelector = document.getElementById('page_selector');
    pageSelector.hidden = false;
    document.getElementById('current_page').hidden = true;
    document.getElementById('pages_selected').hidden = true;
    console.debug('Turn', turn);
    if (turn != 1) {
        document.getElementById('scores_round').hidden = false;
    }/* else {
        document.querySelector('#current_page').hidden = false;
        document.querySelector('#current_page').setAttribute('pagetitle', wiki.mainpage.replace(/ /g, '_'));
        document.querySelector('#current_page').setAttribute('wikiid', wikiid);
    }*/
    const form = pageSelector.querySelector('form');
    const startChoices = pageSelector.querySelector('[name=start_page]');
    const endChoices = pageSelector.querySelector('[name=end_page]');

    startChoices.clearStore();
    endChoices.clearStore();
    startChoices.setAttribute('wikiid', wikiid);
    endChoices.setAttribute('wikiid', wikiid);
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        socket.emit('choosePages', { start: startChoices.getValue().customProperties, end: endChoices.getValue().customProperties });
    }, { once: true });
    document.querySelector('#clock').textContent = 0;
    clearInterval(timerID);
    //clock.stop();
    window.scrollTo(0, 0);
});

socket.on('showPages', ({ start, end, wiki }) => {
    document.getElementById('page_selector').hidden = true;
    document.getElementById('pages_selecting').hidden = true;
    document.getElementById('scores_round').hidden = true;
    document.querySelector('#start_page').innerHTML = `<div><strong>${start.title}</strong></div>
    <div>${start.summary}</div>`;
    document.querySelector('#end_page').innerHTML = `<div><strong>${end.title}</strong></div>
    <div>${end.summary}</div>`;
    const pagesSelected = document.getElementById('pages_selected');
    pagesSelected.hidden = false;
    document.querySelectorAll('player-card').forEach(card => card.steps = 0);

    document.querySelector('#current_historic').removeAttribute('steps');
    document.querySelector('#historic').hidden = false;
    document.querySelector('#current_page').hidden = false;
    document.querySelector('#current_page').setAttribute('pagetitle', start.title.replace(/ /g, '_'));
    document.querySelector('#current_page').setAttribute('wikiid', wiki);
});
document.querySelector('#current_page').addEventListener('navigation', data => socket.emit('navigation', { page: data.detail }));

socket.on('startTimer', ({ time }) => startTimer(time));

socket.on('reachEndPage', () => {
    console.log("Yeah!");
    document.getElementById('scores_round').hidden = false;
    window.scrollTo(0, 0);
});

socket.on('endGame', async ({ stats }) => {
    console.debug('The game is ended');
    console.debug(stats);
    document.getElementById('scores_round').hidden = false;
    let players = Object.keys(stats).filter((val) => val.length === 20);
    players = players.sort((id1, id2) => stats[id2].score - stats[id1].score);

    clearInterval(timerID);
    document.querySelector('#clock').textContent = 0;

    players.forEach((playerID) => {
        const row = document.createElement('div');
        const nameDiv = document.createElement('div');
        const scoreDiv = document.createElement('div');
        const name = document.createElement('p');
        const score = document.createElement('p');

        name.textContent = stats[playerID].name;
        score.textContent = stats[playerID].score;

        row.classList.add('row', 'mx-0', 'align-items-center');
        nameDiv.classList.add('col-7', 'text-center');
        scoreDiv.classList.add('col-3', 'text-center');
        name.classList.add('display-6', 'fw-normal', 'mb-0');
        score.classList.add('display-6', 'fw-normal', 'mb-0');

        nameDiv.append(name);
        scoreDiv.append(score);
        row.append(nameDiv, scoreDiv);
        document.querySelector('#statsDiv').append(row, document.createElement('hr'));
    });
    
    document.getElementById('closeRoom').classList.remove('d-none');
    document.getElementById('closeRoom').hidden = false;
    window.scrollTo(0, 0);
    document.getElementById('closeRoom').addEventListener('click', () => {
        document.querySelector('#game_zone').remove();
        document.querySelector('#game_ended').classList.remove('d-none');
        document.querySelector('#game_ended').hidden = false;
    });
});