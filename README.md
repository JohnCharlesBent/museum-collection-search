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
| Art Institute of Chicago | [api.artic.edu](https://api.artic.edu/docs/) | No | Blocks requests made from web pages; goes through the app's server (Vite in development, Nginx in production) |
| The Met | [Collection API](https://metmuseum.github.io/) | No | Search returns IDs only; each result is fetched separately. No style field |
| Whitney | [whitney.org/api](https://whitney.org/about/website/api) | No | Gallery locations not recorded, only on view or not. No style field |
| Getty | [Linked Art / SPARQL](https://data.getty.edu/museum/collection/docs/) | No | No text index, so title searches take several seconds. No style field |
| Cleveland | [Open Access API](https://openaccess-api.clevelandart.org/) | No | Always request specific `fields`, or the server returns an error the browser can't read |
| Harvard Art Museums | [api-docs](https://github.com/harvardartmuseums/api-docs) | Yes | Max 2,500 requests a day; non-commercial use only |

Gender for the stats page comes from Harvard's and Cleveland's own records
where they have it, and otherwise from [Wikidata](https://www.wikidata.org/).

## Deploying

`npm run build` produces a static site in `dist/`. Three museums still need
the server in front of them, exactly as the Vite dev server does in
development:

- **Art Institute of Chicago** (`/aic`, `/iiif`): blocks requests made
  directly from web pages.
- **The Met** (`/met`): proxied for consistency with development.
- **Harvard** (`/harvard`): the server adds the API key so it never reaches
  the browser.

The Whitney, the Getty and Cleveland are called straight from the page.
[`deploy/nginx-forge.conf`](deploy/nginx-forge.conf) has the Nginx rules for
all of this, plus single-page-app routing (so `/stats` works) and caching for
built files.

### Laravel Forge

1. **Server.** Use an *App* or *Web* server; both come with Nginx and Node.js.
   Vite needs Node 20.19 or later (`node -v` on the server).
2. **Site.** Create a site from this GitHub repository, branch `main`. If
   Forge offers a static or non-PHP project type, choose it. Under
   **Advanced settings**, set the **web directory** to `/dist`. Leave
   zero-downtime deployments and push to deploy on.
3. **Deploy script.** Keep Forge's lines and add the build after
   `cd $FORGE_RELEASE_DIRECTORY` (before `$ACTIVATE_RELEASE()`). Remove any
   `composer install` line, since there's no PHP. The script should look like:

   ```bash
   $CREATE_RELEASE()

   cd $FORGE_RELEASE_DIRECTORY

   npm ci
   npm run build

   $ACTIVATE_RELEASE()
   ```

4. **Environment** (only if you use Harvard). In the site's environment
   (`.env`), add `HARVARD_ENABLED=true` so the build includes Harvard. Don't put
   the key here; it goes in the Nginx config.
5. **Nginx.** Edit the site's Nginx configuration as described at the top of
   [`deploy/nginx-forge.conf`](deploy/nginx-forge.conf): replace the
   `location /` block, remove the PHP block, paste the API blocks, and fill in
   your contact email and (optionally) Harvard key.
6. **Deploy.** Click *Deploy now* (later pushes to `main` deploy
   automatically). Visit the site's free `on-forge.com` domain, or add your own
   domain and certificate under the site's domain settings.
7. **Check.** Run a search with *All* selected and open `/stats`. If the Art
   Institute's results fail while the others work, its bot protection may be
   refusing your server; the Art Institute's engineering team
   (engineering@artic.edu) can help.

Harvard allows 2,500 requests a day. Each visit to Harvard's stats uses about
six, and stats are cached in each visitor's browser for a day.

## Data and terms

Data and images belong to the museums and are used under their terms. In
particular: Harvard's API is for non-commercial use, content must be credited
to Harvard and link back to its page, and data may not be cached for more than
two weeks; the Whitney's data is for non-commercial educational and personal
use with credit to the source; the Art Institute of Chicago asks API users to
identify themselves with an `AIC-User-Agent` header. Each artwork in the app
links back to its page on the museum's site.
