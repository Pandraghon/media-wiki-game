class PageChoice extends HTMLElement {
	constructor() {
		super();
		// element created
		this.selectEl = document.createElement('select');
		if (this.hasAttribute('required')) this.selectEl.setAttribute('required', true);
		this.append(this.selectEl);
		const randomBtn = document.createElement('button');
		Object.assign(randomBtn, {
			textContent: 'Random Page',
			type: 'button',
			className: 'btn btn-quiet mw-ui-block',
		});
		this.append(randomBtn);

		this.options = Object.assign({
			searchResultLimit: 5
		}, 
			this.hasAttribute('options') && JSON.parse(this.getAttribute('options')) || {});
		this.choices = new Choices(this.selectEl, this.options);
		this.searchTimeout = false;
		this.selectEl.addEventListener('search', value => {
			if (this.searchTimeout) clearTimeout(this.searchTimeout);
			this.searchTimeout = setTimeout(() => this.search(value), 350);
		});
		randomBtn.addEventListener('click', () => {
			this.random();
			return false;
		});
	}

	getValue() {
		return this.choices.getValue(...arguments);
	}

	clearStore() {
		return this.choices.clearStore();
	}
  
	connectedCallback() {
		// browser calls this method when the element is added to the document
		// (can be called many times if an element is repeatedly added/removed)
	}
  
	disconnectedCallback() {
		// browser calls this method when the element is removed from the document
		// (can be called many times if an element is repeatedly added/removed)
	}

	renderItem(item) {
		return `<div>
			<div><strong>${item.title}</strong></div>
			<div>${item.summary}</div>
			<div class="choices__snippet">${item.snippet}</div>
		</div>`;
	}

	async fetchPageInfo(page) {
		this.wikiid = this.getAttribute('wikiid');
		if (!this.wikiid) return;
		const wiki = wikis.find(w => w.wikiid == this.wikiid);

		const protocol = /^https?:/.test(currentWiki.server) ? '' : 'https:';

		const id = page.pageid || page.id;
		
		const results = await fetch(`${protocol}${wiki.server}${wiki.scriptpath}/api.php?${(new URLSearchParams({
            action: 'query',
            prop: 'extracts',
            pageids: id,
			exintro: 1,
			explaintext: 1,
			exsectionformat: 'plain',
			exsentences: 3,
            format: 'json',
            origin: '*',
        })).toString()}`)
			.then(res => res.json());
		return {
			pageid: id,
			title: page.title,
			snippet: page.snippet || '',
			summary: results.query.pages[id].extract
		};
	}

	async search(value) {
		this.wikiid = this.getAttribute('wikiid');
		if (!this.wikiid) return;
		const wiki = wikis.find(w => w.wikiid == this.wikiid);

		const protocol = /^https?:/.test(currentWiki.server) ? '' : 'https:';
		
		// https://wiki-fr.guildwars2.com/wiki/Sp%C3%A9cial:ApiSandbox#action=query&format=json&list=backlinks&bltitle=Reine%20Jennah&blnamespace=0&bllimit=5000
		// https://wiki-fr.guildwars2.com/wiki/Sp%C3%A9cial:ApiSandbox#action=query&format=json&list=backlinks%7Csearch&bltitle=Reine%20Jennah&blnamespace=0&bllimit=5000&srsearch=Reine%20Jennah

        let results = await fetch(`${protocol}${wiki.server}${wiki.scriptpath}/api.php?${(new URLSearchParams({
            action: 'query',
            list: 'search',
            srsearch: value.detail.value,
            format: 'json',
            origin: '*',
        })).toString()}`)
			.then(res => res.json())
			.then(res => Promise.all(res.query.search.map(p => this.fetchPageInfo(p))));
		results = results.map(r => ({ value: r.pageid, label: this.renderItem(r), customProperties: r }));
		this.choices.setChoices(results, 'value', 'label', true);
	}

	async random() {
		this.wikiid = this.getAttribute('wikiid');
		if (!this.wikiid) return;
		const wiki = wikis.find(w => w.wikiid == this.wikiid);

		const protocol = /^https?:/.test(currentWiki.server) ? '' : 'https:';
		
		// https://wiki-fr.guildwars2.com/api.php?action=query&list=random&rnnamespace=0&rnlimit=1

        let results = await fetch(`${protocol}${wiki.server}${wiki.scriptpath}/api.php?${(new URLSearchParams({
            action: 'query',
            list: 'random',
            rnnamespace: 0,
			rnlimit: 1,
            format: 'json',
            origin: '*',
        })).toString()}`)
            .then(res => res.json())
            .then(res => Promise.all(res.query.random.map(p => this.fetchPageInfo(p))));
		results = results.map(r => ({ value: r.pageid, label: this.renderItem(r), customProperties: r }));
		this.choices.setChoices(results, 'value', 'label', true);
		this.choices.setChoiceByValue(results[0].value);
	}
  
	static get observedAttributes() {
		return [ 'wikiid' ];
	}
  
	attributeChangedCallback(name, oldValue, newValue) {
		// called when one of attributes listed above is modified
	}
  
  }

  customElements.define('page-choice', PageChoice);