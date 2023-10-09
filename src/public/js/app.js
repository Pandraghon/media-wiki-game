class Game {

	constructor() {
		this.params = new URLSearchParams(window.location.search);
		this.username = localStorage.getItem('username');
		this.token = localStorage.getItem('token');
		this.sessionID = localStorage.getItem("sessionID");

		this.loginSection = document.getElementById('login');
		this.joinSection = document.getElementById('join-room');
		this.roomSection = document.getElementById('room');

		this.socket = io({
			autoConnect: false
		});
		this.socket.onAny((event, ...args) => {
			console.log(event, args);
		});
		this.socket.on("session", ({ sessionID, userID }) => {
			// attach the session ID to the next reconnection attempts
			this.socket.auth = { sessionID };
			// store it in the localStorage
			localStorage.setItem("sessionID", sessionID);
			// save the ID of the user
			this.socket.userID = userID;

			this.joinSection.hidden = false;

			if (this.params.get('roomid')) {
				document.querySelector('input[name=roomid]').value = this.params.get('roomid');
			}

			const newRoomButton = document.querySelector('.js-new-room');
			newRoomButton.addEventListener('click', () => {
				this.socket.emit('new room');
			})
		});

		this.socket.on('room created', ({ roomID }) => {
			console.log('room ID', roomID);
			this.joinSection.hidden = true;
			this.roomSection.hidden = false;

			this.roomSection.querySelector('h2').textContent = `Room ${roomID}`;
		});

		if (this.sessionID) {
			this.socket.auth = { sessionID: this.sessionID };
			this.socket.connect();
		} else {
			this.loginSection.hidden = false;
			const loginForm = this.loginSection.querySelector('form');
			loginForm.addEventListener('submit', (event) => {
				event.preventDefault();
				const username = loginForm.querySelector('input[name=username]').value.trim();
				if (!username) return;
				this.loginSection.hidden = true;
				this.socket.auth = { username };
				this.socket.connect();
			})

		}
	}

	connect(username) {
		
	}

	async initUser() {
		if (!this.token) {
			//generate new user
			fetch('/user/new', {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			})
				.then(res => res.json())
				.then(res => {
					this.username = res.username;
					this.token = res.token;
					localStorage.setItem('username', this.username);
					localStorage.setItem('token', this.token);
				});
		}
	}

	fillUserForm() {
		const usernameField = document.querySelector('[name=username]');
		const tokenField = document.querySelector('[name=token]');
		if (usernameField) {
			usernameField.value = this.username;
		}
		if (tokenField) {
			tokenField.value = this.token;
		}
	}

	async init() {
		await this.initUser();
		this.fillUserForm();
	}

	async run() {
		await this.init();
	}

}

new Game().run();