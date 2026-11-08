# VANDAAG (NL) · TODAY (EN)

Een tweetalige manifestatieomgeving op www.manifestationtool.nl — in het Nederlands
heet de site VANDAAG, in het Engels TODAY: verhelder wat je verlangt, voel het,
zie het voor je — en breng het in beweging. Statische site zonder framework,
npm of buildproces.

## Structuur
- `index.html` … Nederlandse site (root)
- `en/` … volledige Engelse versie
- `css/`, `js/`, `data/`, `assets/` … gedeeld door beide talen
- `data/kaarten.js` … alle kaartdekken (NL en EN), gedeeld door Kaartjes en het moodboard
- `routes/` … zes routes met oefeningen
- `tools/` … Kaartjes (`kaarten.html`, Engels: `en/tools/cards.html`), de drieminutentool (`vandaag.html`, Engels: `en/tools/today.html`), het moodboard (`moodboard.html`, IndexedDB, alleen lokaal), Traagzand (`traagzand.html`, Engels: `en/tools/slowsand.html`) en de Verbeeldingsstudio (preview)
- `404.html`, `sitemap.xml`, `robots.txt` … voor GitHub Pages en zoekmachines

## Uitgangspunten
- **Het hart** van de site is: de drieminutentool (hoofdknop op de homepage), het
  moodboard en de kaartjes. Routes, visies en Traagzand zijn ondersteunend.
- **Twee lagen.** De basis is psychologisch en praktisch (verbeelden, plannen,
  dankbaarheid, kleine stappen). De spirituele laag &mdash; Engelen &amp; tekens &mdash;
  staat apart, met de uitleg dat het een uitnodiging is en geen voorspelling.
- **Toon:** warm en hoopvol, nooit cynisch, nooit beloftes.
- **Invoer:** keuzes waar het kan; eigen woorden mogen in het moodboard.
- **Privacy:** geen account, niets wordt verstuurd. Alles blijft op het apparaat
  van de bezoeker; via Mijn ruimte maakt die een back-up in één bestand.

## Stijl
Gouden uur: warme avondlucht (roze → perzik → goud), crèmekleurig papier,
espresso-inkt, brons en een vleugje amethist. Alle stijl staat in `css/stijl.css`
(kleuren bovenaan als variabelen); pagina's hebben geen eigen `<style>`-blokken meer.
Lettertypen: Cormorant (koppen), Jost (tekst), Allura (alleen het
handgeschreven woordbeeld Vandaag/Today).

## Publiceren op GitHub Pages
1. Maak een nieuwe repository (bijv. `vandaag`).
2. Upload **alle** bestanden en mappen uit deze zip naar de root van de repository.
3. Ga naar *Settings → Pages*, kies bij *Source*: `Deploy from a branch`,
   branch `main`, map `/ (root)`. Opslaan.
4. Na een minuut staat de site op `https://<gebruikersnaam>.github.io/vandaag/`.

Werkt ook direct op Vercel of Netlify (project importeren, geen build command,
output directory: root) én lokaal door `index.html` te openen.

## Ko-fi
De koffieknop staat op elke pagina. Het adres pas je op één plek aan:
in `js/basis.js`, bovenaan — regel `window.VANDAAG_KOFI = "https://ko-fi.com/…";`

## Opslag
"Mijn ruimte" bewaart plannen, oefeningen en kaartjes in de browser (localStorage)
van de bezoeker; het moodboard staat in IndexedDB (`vandaag-moodboard`). Er wordt
niets verstuurd of gedeeld. De back-up in Mijn ruimte zet beide in één JSON-bestand
en kan dat bestand ook weer terugzetten (`V.exportAll` / `V.importAll` in `js/basis.js`).
