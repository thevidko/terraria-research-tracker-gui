import './style.css';
import {
    ChooseTerrariaDir,
    GetStatus,
    ListPlayers,
    LoadResearch,
    OpenConfig,
    OpenWiki,
    Restart,
} from '../wailsjs/go/main/App';
import {EventsOn} from '../wailsjs/runtime/runtime';

const CATEGORIES = [
    ['Melee', 'Na blízko'],
    ['Ranged', 'Na dálku'],
    ['Magic', 'Magie'],
    ['Summon', 'Vyvolávání'],
    ['Sentry', 'Věže'],
    ['Tools', 'Nástroje'],
    ['Accessory', 'Doplňky'],
    ['Armor', 'Zbroj'],
    ['Vanity', 'Kosmetika'],
    ['Fishing', 'Rybaření'],
    ['Placeable', 'Stavební'],
    ['Consumable', 'Spotřební'],
    ['Ammo', 'Munice'],
    ['Material', 'Materiály'],
    ['Dye', 'Barviva'],
    ['Paint', 'Barvy'],
    ['Other', 'Ostatní'],
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES);

const state = {
    status: null,
    players: [],
    current: load('lastPlayer', ''),
    research: null,
    loadedAt: null,
    category: 'all',
    filter: load('filter', 'missing'),
    sort: load('sort', 'id'),
    search: '',
};

const $ = (id) => document.getElementById(id);

function load(key, fallback) {
    try {
        return localStorage.getItem(key) ?? fallback;
    } catch {
        return fallback;
    }
}

function save(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // storage unavailable; the setting just won't be remembered
    }
}

function esc(text) {
    return String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function percent(done, total) {
    if (!total) return '0 %';
    const p = (done / total) * 100;
    return `${p.toLocaleString('cs-CZ', {maximumFractionDigits: p < 10 ? 2 : 1})} %`;
}

let toastTimer;

function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 5000);
}

// --- status -----------------------------------------------------------------

function applyStatus(status) {
    const wasReady = state.status?.state === 'ready';
    state.status = status;
    $('terraria-dir').textContent = status.terrariaDir || '';
    $('game-version').textContent = status.version ? `Terraria ${status.version.replace(/^v/, '')}` : 'Terraria';

    const ready = status.state === 'ready';
    const starting = status.state === 'starting';
    $('screen-status').hidden = ready && !!state.research;
    $('screen-research').hidden = !ready || !state.research;
    $('screen-status').classList.toggle('is-error', !ready && !starting);
    $('status-title').textContent = starting
        ? 'Spouštím Terraria Server…'
        : ready
            ? 'Vyber postavu vlevo'
            : status.state === 'missing'
                ? 'Terraria nenalezena'
                : 'Něco se pokazilo';
    $('status-message').textContent = starting
        ? 'Terraria musí na chvíli naběhnout, aby načetla informace o předmětech.'
        : ready ? 'Ukážu, co už máš vyzkoumané a co ještě chybí.' : status.message;
    $('status-actions').hidden = ready || starting;

    if (ready && !wasReady) refreshPlayers();
}

// --- players ----------------------------------------------------------------

async function refreshPlayers() {
    try {
        state.players = (await ListPlayers()) || [];
    } catch (err) {
        toast(`Nepodařilo se načíst postavy: ${err}`);
        return;
    }
    const journey = state.players.filter((p) => p.journey);
    if (!journey.some((p) => p.path === state.current)) {
        state.current = journey.length ? [...journey].sort((a, b) => b.modified - a.modified)[0].path : '';
    }
    renderPlayers();
    if (state.current) openPlayer(state.current);
    else applyStatus(state.status);
}

function renderPlayers() {
    const journey = state.players.filter((p) => p.journey).sort((a, b) => b.modified - a.modified);
    const others = state.players.filter((p) => !p.journey);

    $('players').innerHTML = journey.length
        ? journey.map((p) => `
            <button type="button" class="player${p.path === state.current ? ' active' : ''}" data-path="${esc(p.path)}">
                <span class="player-name">${esc(p.name)}</span>
                <span class="player-meta">${esc(p.file)}${p.cloud ? ' <span class="tag">Cloud</span>' : ''}</span>
            </button>`).join('')
        : '<p class="muted small">Žádná postava v režimu Journey.</p>';

    $('other-players').hidden = !others.length;
    $('other-count').textContent = `(${others.length})`;
    $('other-list').innerHTML = others
        .map((p) => `<li>${esc(p.name)} <span class="muted">${p.ok ? '' : '– nejde načíst'}</span></li>`)
        .join('');
}

async function openPlayer(path, quiet = false) {
    state.current = path;
    save('lastPlayer', path);
    renderPlayers();
    try {
        const research = await LoadResearch(path);
        if (state.current !== path) return;
        state.research = research;
        state.loadedAt = new Date();
    } catch (err) {
        if (!quiet) toast(`Postavu se nepodařilo načíst: ${err}`);
        return;
    }
    applyStatus(state.status);
    renderResearch();
}

// --- research ---------------------------------------------------------------

const isDone = (it) => it.have >= it.need;
const isPartial = (it) => it.have > 0 && it.have < it.need;

function renderResearch() {
    const {research} = state;
    if (!research) return;
    const items = research.items;
    const done = items.filter(isDone).length;
    const player = state.players.find((p) => p.path === research.path);

    $('player-name').textContent = research.name;
    $('player-meta').textContent = [
        player?.cloud ? 'Steam Cloud' : 'Lokální uložení',
        `načteno ${state.loadedAt.toLocaleTimeString('cs-CZ', {hour: '2-digit', minute: '2-digit'})}`,
        'obnoví se samo po uložení ve hře',
    ].join(' · ');
    $('total-percent').textContent = percent(done, items.length);
    $('total-count').textContent = `${done} z ${items.length} předmětů`;
    $('total-bar').style.width = `${(done / items.length) * 100}%`;

    const byCat = {};
    for (const it of items) {
        const c = (byCat[it.category] ??= {done: 0, total: 0});
        c.total++;
        if (isDone(it)) c.done++;
    }
    const cards = [['all', 'Vše', {done, total: items.length}]]
        .concat(CATEGORIES.filter(([key]) => byCat[key]).map(([key, label]) => [key, label, byCat[key]]));
    $('categories').innerHTML = cards.map(([key, label, c]) => `
        <button type="button" class="cat${state.category === key ? ' active' : ''}${c.done === c.total ? ' complete' : ''}" data-cat="${key}">
            <span class="cat-name">${label}</span>
            <span class="cat-count">${c.done}<span class="muted">/${c.total}</span></span>
            <span class="bar"><span class="bar-fill" style="width:${(c.done / c.total) * 100}%"></span></span>
        </button>`).join('');

    for (const btn of $('filters').children) {
        btn.classList.toggle('active', btn.dataset.filter === state.filter);
        btn.setAttribute('aria-checked', btn.dataset.filter === state.filter);
    }
    $('sort').value = state.sort;
    renderItems();
}

function renderItems() {
    const q = state.search.trim().toLowerCase();
    const filterFn = {
        missing: (it) => !isDone(it),
        partial: isPartial,
        done: isDone,
        all: () => true,
    }[state.filter];
    let rows = state.research.items.filter((it) =>
        (state.category === 'all' || it.category === state.category)
        && filterFn(it)
        && (!q || it.name.toLowerCase().includes(q) || String(it.id) === q));

    const sorters = {
        id: (a, b) => a.id - b.id,
        name: (a, b) => a.name.localeCompare(b.name, 'en'),
        left: (a, b) => (a.need - a.have) - (b.need - b.have) || a.id - b.id,
    };
    rows.sort(sorters[state.sort]);

    document.querySelector('.items').classList.toggle('show-cat', state.category === 'all');
    $('item-rows').innerHTML = rows.map((it) => {
        const have = Math.min(it.have, it.need);
        const cls = isDone(it) ? 'done' : it.have > 0 ? 'partial' : '';
        return `<tr class="${cls}">
            <td class="col-id">${it.id}</td>
            <td><button type="button" class="item-link" data-wiki="${esc(it.name)}" title="Otevřít na wiki">${esc(it.name)}</button></td>
            <td class="col-cat">${CATEGORY_LABEL[it.category] ?? it.category}</td>
            <td class="col-progress"><div class="progress">
                <span class="progress-num">${have}<span class="muted">/${it.need}</span></span>
                <span class="bar"><span class="bar-fill" style="width:${(have / it.need) * 100}%"></span></span>
            </div></td>
        </tr>`;
    }).join('');

    const empty = $('empty');
    empty.hidden = rows.length > 0;
    if (!rows.length) {
        empty.textContent = q
            ? `Nic neodpovídá „${state.search.trim()}“.`
            : state.filter === 'missing' ? 'Tady máš vyzkoumáno všechno. 🎉' : 'Žádné předměty.';
    }
}

// --- wiring -----------------------------------------------------------------

$('players').addEventListener('click', (e) => {
    const btn = e.target.closest('.player');
    if (btn && btn.dataset.path !== state.current) openPlayer(btn.dataset.path);
});

$('categories').addEventListener('click', (e) => {
    const btn = e.target.closest('.cat');
    if (!btn) return;
    state.category = btn.dataset.cat;
    renderResearch();
});

$('filters').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    state.filter = btn.dataset.filter;
    save('filter', state.filter);
    renderResearch();
});

$('sort').addEventListener('change', (e) => {
    state.sort = e.target.value;
    save('sort', state.sort);
    renderItems();
});

$('search').addEventListener('input', (e) => {
    state.search = e.target.value;
    renderItems();
});

$('item-rows').addEventListener('click', (e) => {
    const btn = e.target.closest('.item-link');
    if (btn) OpenWiki(btn.dataset.wiki);
});

async function pickDir() {
    try {
        await ChooseTerrariaDir();
    } catch (err) {
        toast(String(err));
    }
}

$('btn-dir').addEventListener('click', pickDir);
$('btn-pick').addEventListener('click', pickDir);
$('btn-retry').addEventListener('click', () => Restart());
$('btn-config').addEventListener('click', async () => {
    try {
        await OpenConfig();
    } catch (err) {
        toast(String(err));
    }
});

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.key === 'f') || (e.key === '/' && document.activeElement !== $('search'))) {
        e.preventDefault();
        $('search').focus();
    }
});

EventsOn('status', applyStatus);
EventsOn('player-changed', (path) => {
    if (path === state.current) openPlayer(path, true);
});

GetStatus().then(applyStatus);
