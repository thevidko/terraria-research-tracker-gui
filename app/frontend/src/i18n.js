// UI strings. English is the default; add a language by adding another block with the same keys.
const strings = {
    en: {
        locale: 'en-US',
        'side.players': 'Characters',
        'side.others': 'Other characters',
        'side.othersHint': 'Only Journey Mode characters have research.',
        'side.noJourney': 'No Journey Mode character.',
        'side.unreadable': '– can’t be read',
        'side.config': 'Edit omitted items',
        'side.dir': 'Change Terraria folder',
        'side.language': 'Language',

        'status.starting': 'Starting Terraria Server…',
        'status.startingHint': 'Terraria needs to start up for a moment to load item information.',
        'status.ready': 'Pick a character on the left',
        'status.readyHint': 'You’ll see what you’ve researched and what’s still missing.',
        'status.missing': 'Terraria not found',
        'status.missingHint': 'Couldn’t find Terraria in your Steam libraries. Pick its folder by hand.',
        'status.error': 'Something went wrong',
        'status.error.install': 'Couldn’t install the helper into the Terraria folder: {0}',
        'status.error.start': 'Terraria Server didn’t start: {0}',
        'status.retry': 'Try again',
        'status.pick': 'Choose Terraria folder',
        'dialog.pickDir': 'Choose the Terraria folder (contains TerrariaServer.exe)',

        'summary.cloud': 'Steam Cloud',
        'summary.local': 'Local save',
        'summary.loaded': 'loaded {0}',
        'summary.auto': 'refreshes when the game saves',
        'summary.count': '{0} of {1} items',

        'filter.missing': 'Missing',
        'filter.partial': 'In progress',
        'filter.done': 'Done',
        'filter.all': 'All',
        'sort.id': 'Sort by ID',
        'sort.name': 'By name',
        'sort.left': 'By amount left',
        'search': 'Search item or ID…',
        'col.item': 'Item',
        'col.category': 'Category',
        'col.progress': 'Researched',
        'item.wiki': 'Open on the wiki',
        'empty.search': 'Nothing matches “{0}”.',
        'empty.allDone': 'You’ve researched everything here. 🎉',
        'empty.none': 'No items.',

        'error.players': 'Couldn’t load characters: {0}',
        'error.player': 'Couldn’t load the character: {0}',
        'err.not_running': 'Terraria Server isn’t running yet.',
        'err.not_terraria_dir': 'That folder doesn’t contain Terraria (TerrariaServer.exe).',
        'err.terraria_not_found': 'Terraria wasn’t found.',

        'cat.all': 'All',
        'cat.Melee': 'Melee',
        'cat.Ranged': 'Ranged',
        'cat.Magic': 'Magic',
        'cat.Summon': 'Summon',
        'cat.Sentry': 'Sentry',
        'cat.Tools': 'Tools',
        'cat.Accessory': 'Accessory',
        'cat.Armor': 'Armor',
        'cat.Vanity': 'Vanity',
        'cat.Fishing': 'Fishing',
        'cat.Placeable': 'Placeable',
        'cat.Consumable': 'Consumable',
        'cat.Ammo': 'Ammo',
        'cat.Material': 'Materials',
        'cat.Dye': 'Dyes',
        'cat.Paint': 'Paints',
        'cat.Other': 'Other',
    },
    cs: {
        locale: 'cs-CZ',
        'side.players': 'Postavy',
        'side.others': 'Ostatní postavy',
        'side.othersHint': 'Výzkum mají jen postavy v režimu Journey.',
        'side.noJourney': 'Žádná postava v režimu Journey.',
        'side.unreadable': '– nejde načíst',
        'side.config': 'Upravit vynechané předměty',
        'side.dir': 'Změnit složku Terrarie',
        'side.language': 'Jazyk',

        'status.starting': 'Spouštím Terraria Server…',
        'status.startingHint': 'Terraria musí na chvíli naběhnout, aby načetla informace o předmětech.',
        'status.ready': 'Vyber postavu vlevo',
        'status.readyHint': 'Ukážu, co už máš vyzkoumané a co ještě chybí.',
        'status.missing': 'Terraria nenalezena',
        'status.missingHint': 'Terraria se v knihovnách Steamu nenašla. Vyber její složku ručně.',
        'status.error': 'Něco se pokazilo',
        'status.error.install': 'Nepodařilo se nainstalovat pomocníka do složky Terrarie: {0}',
        'status.error.start': 'Terraria Server se nespustil: {0}',
        'status.retry': 'Zkusit znovu',
        'status.pick': 'Vybrat složku Terrarie',
        'dialog.pickDir': 'Vyber složku s Terrarií (obsahuje TerrariaServer.exe)',

        'summary.cloud': 'Steam Cloud',
        'summary.local': 'Lokální uložení',
        'summary.loaded': 'načteno {0}',
        'summary.auto': 'obnoví se samo po uložení ve hře',
        'summary.count': '{0} z {1} předmětů',

        'filter.missing': 'Chybí',
        'filter.partial': 'Rozpracované',
        'filter.done': 'Hotovo',
        'filter.all': 'Vše',
        'sort.id': 'Řadit podle ID',
        'sort.name': 'Podle názvu',
        'sort.left': 'Podle zbývajícího počtu',
        'search': 'Hledat předmět nebo ID…',
        'col.item': 'Předmět',
        'col.category': 'Kategorie',
        'col.progress': 'Vyzkoumáno',
        'item.wiki': 'Otevřít na wiki',
        'empty.search': 'Nic neodpovídá „{0}“.',
        'empty.allDone': 'Tady máš vyzkoumáno všechno. 🎉',
        'empty.none': 'Žádné předměty.',

        'error.players': 'Nepodařilo se načíst postavy: {0}',
        'error.player': 'Postavu se nepodařilo načíst: {0}',
        'err.not_running': 'Terraria Server ještě neběží.',
        'err.not_terraria_dir': 'V téhle složce není Terraria (TerrariaServer.exe).',
        'err.terraria_not_found': 'Terraria nebyla nalezena.',

        'cat.all': 'Vše',
        'cat.Melee': 'Na blízko',
        'cat.Ranged': 'Na dálku',
        'cat.Magic': 'Magie',
        'cat.Summon': 'Vyvolávání',
        'cat.Sentry': 'Věže',
        'cat.Tools': 'Nástroje',
        'cat.Accessory': 'Doplňky',
        'cat.Armor': 'Zbroj',
        'cat.Vanity': 'Kosmetika',
        'cat.Fishing': 'Rybaření',
        'cat.Placeable': 'Stavební',
        'cat.Consumable': 'Spotřební',
        'cat.Ammo': 'Munice',
        'cat.Material': 'Materiály',
        'cat.Dye': 'Barviva',
        'cat.Paint': 'Barvy',
        'cat.Other': 'Ostatní',
    },
};

export const LANGUAGES = [['en', 'English'], ['cs', 'Čeština']];

let lang = 'en';

export function setLanguage(code) {
    lang = strings[code] ? code : 'en';
    document.documentElement.lang = lang;
    return lang;
}

export function getLanguage() {
    return lang;
}

/** t('summary.count', 3, 10) fills {0}, {1}, … */
export function t(key, ...args) {
    const text = strings[lang][key] ?? strings.en[key] ?? key;
    return text.replace(/\{(\d+)}/g, (_, i) => args[i] ?? '');
}

/** Error from the Go side: known codes get translated, anything else is shown as is. */
export function errorText(err) {
    const msg = String(err?.message ?? err);
    return strings[lang][`err.${msg}`] ?? strings.en[`err.${msg}`] ?? msg;
}

/** Fills elements marked with data-i18n (text), data-i18n-placeholder and data-i18n-title. */
export function translatePage(root = document) {
    for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    for (const el of root.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
    for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
}
