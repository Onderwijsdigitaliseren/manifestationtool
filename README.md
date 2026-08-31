# VANDAAG

Een tweetalige (NL/EN) manifestatieomgeving: verhelder wat je verlangt, voel het,
zie het voor je — en breng het in beweging. Statische site zonder framework,
npm of buildproces.

## Structuur
- `index.html` … Nederlandse site (root)
- `en/` … volledige Engelse versie
- `css/`, `js/`, `data/`, `assets/` … gedeeld door beide talen
- `routes/` … zes routes met oefeningen
- `tools/` … de drieminutentool en de Verbeeldingsstudio (preview)

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
"Mijn ruimte" bewaart plannen en oefeningen in de browser (localStorage) van de
bezoeker. Er wordt niets verstuurd of gedeeld.
