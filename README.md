# Queen's Pub Kvíz

Hospodský kvíz pro Queen's Pub Brno ve stylu Kahootu. Tři obrazovky:

- **`/moderator`** — ovládá moderátor (spouští otázky, uzamyká registraci, posouvá hru dál)
- **`/tv`** — velká obrazovka na televizi (otázky, časomíra, průběžné pořadí)
- **`/`** — otevírají hráči na svých telefonech (zadají PIN, název týmu, odpovídají A/B/C)

Hráči se připojují přes **PIN hry** (4místné číslo), který appka vygeneruje při každé nové hře a zobrazí na TV. Appka musí běžet na veřejně dostupné adrese (viz "Nasazení do cloudu" níže) — hráči totiž budou k appce přistupovat přes svá vlastní mobilní data, ne přes wifi podniku.

## Formát hry (jak appka funguje)

1. Moderátor otevře `/moderator`, přihlásí se moderátorským klíčem.
2. Na TV (`/tv`) se zobrazí PIN hry a QR kód. Hráči se připojí, zadají název týmu.
3. Moderátor klikne **"Uzamknout registraci a spustit Kolo 1"** — nové týmy se už nemůžou přidat.
4. Moderátor klikne **"Spustit první otázku"** — na všech obrazovkách se objeví otázka a spustí se 3minutová časomíra.
5. Týmy na telefonech vybírají A/B/C. Po vypršení času (nebo když moderátor klikne "Ukončit otázku teď") se zobrazí správná odpověď a průběžné pořadí.
   - Za správnou a nejrychlejší odpověď: **5 bodů**, druhý nejrychlejší správný tým: **3 body**, třetí: **1 bod**.
6. Moderátor klikne **"Další otázka"** a opakuje se to pro všech 20 otázek kola.
7. Po 20. otázce kola 1 appka automaticky přejde do **pauzy** — týmy zůstávají přihlášené se svým skóre.
8. Moderátor klikne **"Spustit Kolo 2"**, hraje se dalších 20 otázek stejným způsobem.
9. Po poslední otázce kola 2 se zobrazí **finální pořadí a vítěz**.
10. Na konci večera moderátor může kliknout **"Nová hra"** — vymaže týmy a skóre, vygeneruje nový PIN pro příští kvíz.

Otázky pro kolo 1 ("Queens, který znáš") a kolo 2 ("Queens Lore") jsou v [`server/questions.js`](server/questions.js) — je jich 20 + 20, přepsané z `QUEENS KVÍZ_01.pdf`. Pro další kvízový večer stačí do tohoto souboru doplnit nové otázky ve stejném formátu (`text`, `options` — pole 3 možností, `correct` — index 0/1/2 správné odpovědi).

## Lokální test na vlastním počítači

Potřebuješ nainstalovaný [Node.js](https://nodejs.org) (stačí verze 18+).

```bash
cd app
npm install
npm start
```

V terminálu se vypíše moderátorský klíč (mění se při každém spuštění serveru) a adresy, na kterých appka běží. Appka se zapisuje i do souboru `HOST_KEY.txt` v této složce, kdyby ses potřeboval podívat na klíč znovu, aniž bys hledal v terminálu.

Otevři si v prohlížeči `http://localhost:3000/moderator` (přihlásíš se klíčem), `http://localhost:3000/tv` a `http://localhost:3000/` (hráč) — to celé jde otestovat sám na jednom počítači ve třech kartách prohlížeče.

## Nasazení do cloudu (aby appku mohli hráči otevřít na mobilních datech)

Appka je standardní Node.js server (Express + Socket.IO) — nezávisí na tom, kde běží. Doporučený postup přes **[Render.com](https://render.com)** (má jednoduchý bezplatný web service):

1. **Založ si GitHub repozitář** pro tuhle složku (`app/`) a nahraj do něj kód (přes GitHub Desktop, nebo příkazy `git init`, `git add`, `git commit`, `git push` — dej vědět, pokud s tím chceš pomoct).
2. Na [render.com](https://render.com) si **založ účet** (přes GitHub) — to musíš udělat ty osobně, nemůžu to udělat za tebe.
3. V Render klikni **New → Blueprint**, vyber svůj GitHub repozitář — Render si sám najde přiložený `render.yaml` a appku nastaví (build `npm install`, start `npm start`).
4. Po nasazení dostaneš veřejnou adresu typu `https://queens-pub-kviz.onrender.com` — to je adresa, kterou appka bude ukazovat na TV obrazovce a kterou vygenerovaný QR kód automaticky použije (appka si adresu zjišťuje sama z prohlížeče, nikde ji není potřeba ručně nastavovat).
5. Moderátorský klíč pro produkční appku najdeš v Render dashboardu v záložce **Logs** hned po spuštění (appka ho tam při startu vypíše stejně jako lokálně).

### Důležité pro živý večer

- **Bezplatný tarif Render appku "uspí"**, pokud 15 minut nikdo nepřistupuje — první hráč, co appku otevře, pak čeká cca 30–60 sekund, než se appka probudí. Doporučuju **10 minut před začátkem kvízu appku sám otevřít** (stačí navštívit její adresu v prohlížeči), ať je vzhůru, až přijdou hráči. Pokud chceš mít jistotu (appka nikdy neusne), přepni v Render na placený tarif **Starter** (cca 175 Kč/měsíc) — v `render.yaml` stačí `plan: starter` místo `plan: free`.
- Appka si po každé změně (přihlášení týmu, odpověď, posun hry) ukládá stav do souboru na disku, takže krátký výpadek/restart appku neshodí — týmy a skóre zůstanou. Na bezplatném tarifu Render ale disk **není garantovaně trvalý** napříč restarty/nasazeními, takže pro jistotu doporučuju appku **znovu nespouštět/nenasazovat v průběhu hraní** (jen před večerem a po něm).

## Struktura projektu

```
app/
  server/
    index.js       — Express + Socket.IO server, propojení všech obrazovek
    gameState.js    — herní logika (kola, otázky, časomíra, bodování)
    questions.js    — banka otázek (kolo 1 + kolo 2)
  public/
    index.html + js/player.js       — obrazovka pro hráče
    moderator.html + js/moderator.js — obrazovka pro moderátora
    tv.html + js/tv.js               — obrazovka na TV
    css/style.css                    — vzhled podle brandu Queen's Pub
    fonts/, img/                     — font Montserrat a logo (offline, bez CDN)
```
