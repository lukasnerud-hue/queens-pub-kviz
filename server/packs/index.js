// Registr všech dostupných balíčků otázek (témat). Pro nové téma stačí
// přidat další soubor vedle "queens-pub-kviz-1.js" ve stejném formátu
// ({ id, title, rounds }) a přidat ho sem do seznamu PACKS.

const queensPubKviz1 = require("./queens-pub-kviz-1");

const PACKS = [queensPubKviz1];

function getPack(id) {
  return PACKS.find((p) => p.id === id) || PACKS[0];
}

function packSummaries() {
  return PACKS.map((p) => ({ id: p.id, title: p.title }));
}

module.exports = { PACKS, getPack, packSummaries };
