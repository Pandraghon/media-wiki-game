import express from 'express';
const app = express();
import http from 'http';
const server = http.createServer(app);
import bodyParser from 'body-parser';
import url from 'url';
import path from 'path';
import fetch from 'node-fetch';
import pg from 'pg';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pgPool = new pg.Pool({
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: 'postgres',
    database: process.env.POSTGRES_DB,
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({ extended: true }));

// view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public'), {
	dotfiles: 'ignore'
}));

app.get('/', async (req, res) => {
    const roomID = req.query.id;
    const wikis = await pgPool.query('SELECT * FROM game.wiki');
    res.render('index', { wikis: wikis.rows, roomID });
});

app.post('/add', async (req, response) => {
    try {
        const roomId = req.body.room;
        const newWikiURL = req.body['new-wiki'];

        let apiLink = await fetch(newWikiURL)
            .then(res => res.text())
            .then(res => /<link[^>]+rel="EditURI"[^>]+href="([^>]+)\?action=rsd"/gi.exec(res));
        if (!apiLink || apiLink.length < 2) {
            return response.redirect(`/room/${roomId}?error=invalid-link`);
        }
        apiLink = apiLink[1];

        const wikiData = await fetch(`https:${apiLink}?action=query&meta=siteinfo&formatversion=2&format=json`, {
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
        const existing = await pgPool.query('SELECT count(*) FROM game.wiki where wikiid = $1', [wikiData.wikiid]);
        if (existing.rows[0].count > 0) {
            return response.redirect(`/room/${roomId}?wikiid=${wikiData.wikiid}&error=already-exists`);
        }

        const created = await pgPool.query('INSERT INTO game.wiki (wikiid, sitename, mainpage, server, articlepath, scriptpath, logo, favicon, lang) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [wikiData.wikiid, wikiData.sitename, wikiData.mainpage, wikiData.server, wikiData.articlepath, wikiData.scriptpath, wikiData.logo, wikiData.favicon, wikiData.lang]);

        return response.redirect(`/room/${roomId}?wikiid=${wikiData.wikiid}`);
    } catch (e) {
        return response.redirect(`/room/${roomId}?error=unknown`);
    }
});

/* instrument(io, { 
    auth: {
        type: 'basic',
        username: process.env.IO_AUTH_USER || 'admin',
        password: process.env.IO_AUTH_PASSWORD || 'IoAdminPassword'
    }
}); */

export default server;