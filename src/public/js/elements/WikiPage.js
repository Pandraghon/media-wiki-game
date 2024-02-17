class WikiPage extends HTMLElement {
	constructor() {
	  super();
	  // element created
	  this.attachShadow({mode: 'open'});
	}
  
	connectedCallback() {
	  // browser calls this method when the element is added to the document
	  // (can be called many times if an element is repeatedly added/removed)
	}
  
	disconnectedCallback() {
	  // browser calls this method when the element is removed from the document
	  // (can be called many times if an element is repeatedly added/removed)
	}
  
	static get observedAttributes() {
	  return [ 'pagetitle', 'wikiid' ];
	}
  
	attributeChangedCallback(name, oldValue, newValue) {
	  // called when one of attributes listed above is modified
	  this.render();
	}

	clear() {
		this.shadowRoot.innerHTML = '';
	}

	async render() {
		this.pagetitle = this.getAttribute('pagetitle');
		this.wikiid = this.getAttribute('wikiid');
		
		if (!this.pagetitle || !this.wikiid) return this.clear();
		const currentWiki = wikis.find(w => w.wikiid == this.wikiid);

		const protocol = /^https?:/.test(currentWiki.server) ? '' : 'https:';

		// add default style
		const siteStyleEl = document.createElement('link');
		Object.assign(siteStyleEl, {
			rel: 'stylesheet',
			href: `${protocol}${currentWiki.server}${currentWiki.scriptpath}/load.php?${(new URLSearchParams({
				modules: 'site.styles|skins.vector.styles.legacy',
				only: 'styles',
				skin: 'vector',
				debug: 'false'
			})).toString()}`
		});

		const pageStyleEl = document.createElement('link');
		Object.assign(pageStyleEl, {
			rel: 'stylesheet',
			href: '/css/page.css'
		});

		// fetch Page text and styles based on modukes used
		console.debug('Fetching content');
		await fetch(`${protocol}${currentWiki.server}${currentWiki.scriptpath}/api.php?${(new URLSearchParams({
			action: 'parse',
			format: 'json',
			page: this.pagetitle,
			prop: 'modules|text|jsconfigvars',
			disableeditsection: 'true',
			origin: '*',
			redirects: true,
		})).toString()}`)
			.then(res => res.json())
			.then(res => {
				this.dispatchEvent(new CustomEvent('navigation', { detail: res.parse.title }));
				const heading = document.createRange().createContextualFragment(`<h1 id="firstHeading" class="firstHeading">${res.parse.title}</h1>`)
				const frag = document.createRange().createContextualFragment(res.parse.text['*']);
				// deactivate external links
				frag.querySelectorAll('a:is(.external, .extiw)').forEach(elem => elem.removeAttribute('href'));
				// fix relative img src
				frag.querySelectorAll('img[src^="/"]:not([src^="//"])').forEach(elem => {
					elem.src = `${protocol}${currentWiki.server}${elem.getAttribute('src')}`;
					if (elem.hasAttribute('srcset')) elem.srcset = elem.getAttribute('srcset').split(', ').map(s => `${protocol}${currentWiki.server}${s}`).join(', ');
				});

				const styleEl = document.createElement('link');
				Object.assign(styleEl, {
					rel: 'stylesheet',
					href: `${protocol}${currentWiki.server}${currentWiki.scriptpath}/load.php?${(new URLSearchParams({
						modules: res.parse.modulestyles.join('|'),
						only: 'styles',
						skin: 'vector',
						debug: 'false'
					})).toString()}`
				});

				this.clear();
				this.shadowRoot.prepend(siteStyleEl, pageStyleEl);
				this.shadowRoot.append(styleEl, heading, frag);

				window.scrollTo(0, 0);

				this.shadowRoot.querySelectorAll('a[href^="#"]').forEach(elem => elem.addEventListener('click', (e) => {
					e.preventDefault();
					this.shadowRoot.getElementById(decodeURIComponent(elem.hash.slice(1))).scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
				}));

				this.shadowRoot.querySelectorAll('a[href^="/"]').forEach(elem => elem.addEventListener('click', (e) => {
					e.preventDefault();
					let pagetitle = elem.pathname.split('/');
					pagetitle = decodeURIComponent(pagetitle[pagetitle.length - 1]).replace(/_/g, ' ');
					this.setAttribute('pagetitle', pagetitle);
				}));
			})
			.catch(console.error);
	}
  
  }

  customElements.define('wiki-page', WikiPage);