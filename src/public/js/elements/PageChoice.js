class PageChoice extends HTMLElement {
	constructor() {
		super();
		// element created
		this.selectEl = document.createElement('select');
		if (this.hasAttribute('required')) this.selectEl.setAttribute('required', true);
		this.append(this.selectEl);
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
			<div>${item.snippet}</div>
		</div>`;
	}

	search(value) {
		this.wikiid = this.getAttribute('wikiid');
		if (!this.wikiid) return;
		const wiki = wikis.find(w => w.wikiid == this.wikiid);
		
		// https://wiki-fr.guildwars2.com/wiki/Sp%C3%A9cial:ApiSandbox#action=query&format=json&list=backlinks&bltitle=Reine%20Jennah&blnamespace=0&bllimit=5000

        fetch(`https:${wiki.server}${wiki.scriptpath}/api.php?${(new URLSearchParams({
            action: 'query',
            list: 'search',
            srsearch: value.detail.value,
            format: 'json',
            origin: '*',
        })).toString()}`)
            .then(res => res.json())
            .then(res => {
                const results = res.query.search.map(r => ({ value: r.pageid, label: this.renderItem(r), customProperties: r }));
                this.choices.setChoices(results, 'value', 'label', true);
            });
	}
  
	static get observedAttributes() {
		return [ 'wikiid' ];
	}
  
	attributeChangedCallback(name, oldValue, newValue) {
		// called when one of attributes listed above is modified
	}
  
  }

  customElements.define('page-choice', PageChoice);