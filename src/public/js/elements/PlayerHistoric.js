class PlayerHistoric extends HTMLElement {
	constructor() {
		super();
		// element created
		this.attachShadow({mode: 'open'});
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

	clear() {
		this.shadowRoot.innerHTML = '';
	}

	render() {
		const steps = JSON.parse(this.getAttribute('steps') || '[]');

		const ulEl = document.createElement('ul');
		for (let i = 0, imax = steps.length ; i < imax ; i++) {
			const liEl = document.createElement('li');
			const aEl = document.createElement('a');
			const step = steps[i];
			Object.assign(aEl, {
				innerText: step,
				href: `/${step}`
			});
			liEl.append(aEl);
			ulEl.append(liEl);
		}
		this.clear();
		this.shadowRoot.append(ulEl);
		this.shadowRoot.querySelectorAll('a[href^="/"]').forEach(elem => elem.addEventListener('click', (e) => {
			e.preventDefault();
			let pagetitle = elem.pathname.split('/');
			pagetitle = decodeURIComponent(pagetitle[pagetitle.length - 1]).replace(/_/g, ' ');
			document.getElementById('current_page').setAttribute('pagetitle', pagetitle);
		}));
	}
  
	static get observedAttributes() {
		return [ 'steps' ];
	}
  
	attributeChangedCallback(name, oldValue, newValue) {
		// called when one of attributes listed above is modified
		this.render();
	}
  
  }

  customElements.define('player-historic', PlayerHistoric);