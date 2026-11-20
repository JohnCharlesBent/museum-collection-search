# Museum Collection Search

A React app for searching the collections of several museums at once — by
artist, artwork title, style or keyword — with a page of statistics about
each collection.

- **Search** across the Art Institute of Chicago, The Met, the Whitney, the
  Getty, the Cleveland Museum of Art and (with an API key) Harvard Art Museums,
  or any one of them. Results are mixed into one gallery-style grid.
- **On view**: each work shows whether it's on display and, where the museum
  says, in which gallery. A switch limits results to works on view now.
- **Detail view** with a large image, the museum's description and details,
  and links to more by the same artist, more in the same style, and the
  work's page on the museum's site.
- **Collection stats** (`/stats`): size, share on view, when works were made,
  types of work, styles, most-collected artists, and the gender balance of
  artists, per museum. Stats are cached in the browser for a day.

## Getting started

Requires Node.js 20.19 or later (needed by Vite 7).

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173).

### Harvard Art Museums (optional)

Harvard's API needs a free key.
[Request one here](https://docs.google.com/forms/d/1Fe1H4nOhFkrLpaeBpLAnSrIMYvcAxnYWm0IU9a6IkFA/viewform),
then:

```bash
cp .env.example .env.local
# edit .env.local and set HARVARD_API_KEY=your-key
```

Restart `npm run dev`. Harvard appears in the app only when a key is set. The
key is added to requests by the Vite dev server and never reaches the browser.
`.env.local` is ignored by git.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (with the API proxies) |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## How it works

```
src/
  api/          one file per museum: builds its search request and converts
                its results to a shared format; search.js runs them together
  stats/        one file per museum for the stats page, plus Wikidata gender
                lookup and the browser cache
  components/   search page, artwork cards and detail view, stats page, charts
```

Each museum's API is different, so each file in `src/api/` translates the
app's search (artist, artwork, style, keyword, on view, page) into that
museum's request and converts the results to the same fields. `search.js`
sends the requests to the chosen museums in parallel, splits each page of 12
results between them, and interleaves the results.

| Museum | API | Key | Notes |
| --- | --- | --- | --- |
| Art Institute of Chicago | [api.artic.edu](https://api.artic.edu/docs/) | No | Blocks requests made from web pages; goes through the dev-server proxy |
| The Met | [Collection API](https://metmuseum.github.io/) | No | Search returns IDs only; each result is fetched separately. No style field |
| Whitney | [whitney.org/api](https://whitney.org/about/website/api) | No | Gallery locations not recorded, only on view or not. No style field |
| Getty | [Linked Art / SPARQL](https://data.getty.edu/museum/collection/docs/) | No | No text index, so title searches take several seconds. No style field |
| Cleveland | [Open Access API](https://openaccess-api.clevelandart.org/) | No | Always request specific `fields`, or the server returns an error the browser can't read |
| Harvard Art Museums | [api-docs](https://github.com/harvardartmuseums/api-docs) | Yes | Max 2,500 requests a day; non-commercial use only |

Gender for the stats page comes from Harvard's and Cleveland's own records
where they have it, and otherwise from [Wikidata](https://www.wikidata.org/).

## Deploying

`npm run build` produces a static site, but some museums need a server in
front of them once the site is live:

- **Art Institute of Chicago**: requests made directly from a web page are
  blocked, so the deployed site needs a small proxy (as `vite.config.js` does
  in development) for `/aic` and `/iiif`.
- **Harvard**: the API key must be added by a server, never shipped to the
  browser, so `/harvard` needs the same kind of proxy.
- **The Met** is also proxied in development; check whether it allows direct
  requests from your domain before relying on that.
- The Whitney, the Getty and Cleveland allow requests straight from the page.
- The host must send `/stats` to `index.html` (often called a single-page app
  or "rewrite all to index.html" setting).

## Data and terms

Data and images belong to the museums and are used under their terms. In
particular: Harvard's API is for non-commercial use, content must be credited
to Harvard and link back to its page, and data may not be cached for more than
two weeks; the Whitney's data is for non-commercial educational and personal
use with credit to the source; the Art Institute of Chicago asks API users to
identify themselves with an `AIC-User-Agent` header. Each artwork in the app
links back to its page on the museum's site.
