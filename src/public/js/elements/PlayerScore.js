class PlayerScore extends HTMLElement {
	constructor() {
		super();
		// element created
		this.render();
	}
  
	connectedCallback() {
		// browser calls this method when the element is added to the document
		// (can be called many times if an element is repeatedly added/removed)
	}
  
	disconnectedCallback() {
		// browser calls this method when the element is removed from the document
		// (can be called many times if an element is repeatedly added/removed)
	}

	set name(name) {
		this.querySelector('.player-name').textContent = name;
	}

	set steps(steps) {
		this.renderSteps(steps);
	}

	renderSteps(steps) {
		this.wikiid = this.getAttribute('wikiid');
		const currentWiki = wikis.find(w => w.wikiid == this.wikiid);
		const protocol = /^https?:/.test(currentWiki.server) ? '' : 'https:';

		const listEl = this.querySelector('.player-steps-list');
		listEl.innerHTML = '';
		for (let i = 0, imax = steps.length ; i < imax ; i++) {
			const stepEl = document.createElement('li');
			const stepA = document.createElement('a');
			Object.assign(stepA, {
				textContent: steps[i].replace(/_/g, ' '),
				target: '_blank',
				href: `${protocol}${currentWiki.server}${currentWiki.articlepath.replace('$1', steps[i])}`
			});
			stepEl.append(stepA);
			listEl.append(stepEl);
		}
		this.querySelector('.player-steps-count').textContent = steps.length;
	}

	render() {
		const name = this.getAttribute('name');
		const nameEl = document.createElement('span');
		nameEl.classList.add('player-name');
		nameEl.textContent = name;
		const stepsEl = document.createElement('span');
		stepsEl.classList.add('player-steps');
		Object.assign(stepsEl, {
			innerHTML: ' (<span class="player-steps-count"></span> steps)',
		});
		const stepsList = document.createElement('ul');
		stepsList.classList.add('player-steps-list');
		this.append(nameEl, stepsEl, stepsList);
	}
  
	static get observedAttributes() {
		return [ 'name', 'steps' ];
	}
  
	attributeChangedCallback(name, oldValue, newValue) {
		// called when one of attributes listed above is modified
		this[name] = newValue;
	}
  
  }

  customElements.define('player-score', PlayerScore);