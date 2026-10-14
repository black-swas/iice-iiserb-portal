# Deploying the IICE website

Written for the people who host and maintain the site: the IISER Bhopal web team and whoever takes over from the original
developer. It covers hosting, the settings a build needs, what is generated for the server, going live, and undoing a deploy.

The site is the folder `out/` that `npm run build` produces: plain HTML, CSS, JavaScript and images. There is no application
server to run and no database. Anything that can serve files can host it.

## 1. Choose where it is served

The hosting decision is still open (SRD §8.4, Q3). Both options work from the same build.

**The institute's own server (Apache or Nginx).** `deploy.yml` builds in GitHub Actions and copies `out/` to the server over
SSH, into `releases/<commit>-<time>/`, then switches a `current` symlink in one step. Point the web server's document root at
`<DEPLOY_PATH>/current`. The five newest releases are kept.

**A static host (Cloudflare Pages, Netlify, GitHub Pages).** Connect the repository, use `npm run build` as the build command
and `out` as the output folder, and set the variables in section 2. Cloudflare Pages and Netlify read the generated
`_redirects` and `_headers` files; GitHub Pages reads neither, so it gets the redirects as HTML stubs (see section 3) but not
the security headers. In that case do not use `deploy.yml`; turn it off or delete it.

**Vercel.** The committed `vercel.json` tells Vercel what it needs (a plain static site, `npm run build`, `out/`, trailing slashes), and
carries the security headers, the year-long cache for fingerprinted files and the permanent redirects for the old addresses.
To connect it:

1. In Vercel, **Add New › Project**, import this repository, and leave the settings as they are: `vercel.json` sets the framework to "Other" (a static export has no server for Vercel's Next.js builder to look for) and the output folder to `out`.
2. Under **Settings › Environment Variables**, add the variables in section 2. Give `NEXT_PUBLIC_SITE_URL` the address the
   site will have; until the real domain points at Vercel, that is the `*.vercel.app` address (canonical addresses, the sitemap
   and the feed are built from it). Tick **Production** and **Preview** as needed; set `NEXT_PUBLIC_SHOW_TODOS=1` for **Preview** only.
3. Deploy. Every push to `main` becomes a production deploy, and every pull request gets a preview address.
4. For the daily rebuild (section 7): **Settings › Git › Deploy Hooks**, create a hook for `main`, and save its address as the
   repository secret `VERCEL_DEPLOY_HOOK`. `deploy.yml` calls it every day at 00:30 IST.
5. To use the institute's domain, add it under **Settings › Domains** and create the DNS record Vercel shows. Do this only once
   `npm run check:launch` is clean; it also changes what the old Google Site address does.

`vercel.json` is written by `npm run redirects` (part of every build) and committed, because Vercel reads it before building.
If a build changes it, commit the change. Redirects to pages that do not exist yet are left out; the HTML stubs in `out/` still
cover any old address that `vercel.json` lacks.

Whichever you choose, serve the site over HTTPS only. The security headers include HSTS, which makes browsers refuse plain HTTP.

## 2. Settings for a build

These are public values: they end up inside the pages, so never put a secret in one. In GitHub they are repository variables
(Settings › Secrets and variables › Actions › Variables); on a static host they are its build environment variables. `.env.example`
lists them with their meaning.

| Variable | Set it to |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | The address of the live site, without a trailing slash. Used for canonical addresses, the sitemap and the feed |
| `NEXT_PUBLIC_FORM_ENDPOINT` | The form endpoint's address (`apps-script/README.md`). Until it is set the live site shows an email address instead of each form |
| `NEXT_PUBLIC_MAP_EMBED_URL` | The map embed address. The site's `mapEmbedUrl` setting does the same job from the editor |
| `NEXT_PUBLIC_ANALYTICS_*` | Leave empty for no analytics. Changing this means changing the privacy page, which says the site has no tracking code |
| `NEXT_PUBLIC_SHOW_TODOS` | Set to `1` **only on a preview**. It shows placeholders and marks the site `noindex`. Never on the live site |

The SSH route of `deploy.yml` runs only when the repository variable `DEPLOY_TARGET` is `ssh`, and then needs five secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_SSH_KEY` (a private key that may only
write to the deploy folder) and `DEPLOY_KNOWN_HOSTS` (the output of `ssh-keyscan` for the host, so the connection is verified).
Create an environment called `production` to require an approval before deploys.

## 3. What the build generates for the server

You do not edit these; they come from `src/content/redirects.ts` and `src/lib/security.ts`.

| File | For | What it holds |
| --- | --- | --- |
| `out/.htaccess` | Apache | Permanent redirects for the old Google Sites addresses, the 404 page, security headers, caching |
| `deploy/nginx-redirects.conf` | Nginx | The same, to `include` inside the `server` block. Nginx drops inherited headers in a block that sets its own, so they are repeated where needed |
| `out/_redirects`, `out/_headers` | Cloudflare Pages, Netlify | The same, in their format |
| `vercel.json` (repository root, committed) | Vercel | The same, in its format, plus the build settings |
| redirect stubs in `out/` | any host | A small HTML page at each old address, with a meta refresh and a link, for hosts that can do no redirects at all |

The Content-Security-Policy is **inside each page**, as a `<meta>` tag with the hashes of that page's inline scripts, because
those scripts differ from page to page and a single header could not name them. The one directive a `<meta>` cannot carry,
`frame-ancestors`, is in the headers above. The policy lets a page talk to its own site, the form endpoint, the map and, if set,
the analytics host, and nothing else.

A legacy address is only redirected if the page it points to exists. `npm run build` prints the ones it skipped (for example
the Documents addresses, until the PDFs are supplied).

## 4. Before the first real deploy

1. Run `npm run check:launch`. It lists every placeholder that a live page would show and every published entry still flagged
   `TODO_CONFIRM`. It is meant to fail until IICE has confirmed the content (SRD §8.3 is the checklist); a launch needs it clean.
2. Set the variables in section 2, with the real `NEXT_PUBLIC_SITE_URL` and the form endpoint.
3. Run `npm run lhci` against a build made with `NEXT_PUBLIC_SITE_URL=http://localhost:4175`, and `npm run size`.
4. Set up the form endpoint, and send one of each form to see the row and the email arrive.
5. Add the PDFs the Documents page needs to `public/documents/`, and the logo files and photos to `content/media/`.

## 5. The editor

`/admin/` is Decap CMS, configured by `public/admin/config.yml`, which is generated from the schemas (`npm run cms:config`).
Saving in the editor commits to the repository, and `deploy.yml` publishes the commit. Who may sign in depends on the host
(SRD Q3): with GitHub as the backend, editors need a GitHub account with write access and the site needs an OAuth proxy; on a
static host that offers Git Gateway or similar, use that. `backend.repo` in `scripts/lib/cms-config.ts` names the repository (`black-swas/IICE-project`); if it moves,
change it, run `npm run cms:config`, and commit the result. On Vercel there is no Git Gateway, so signing in with GitHub needs an OAuth proxy of its own. For editing on your own computer with no sign-in, run `npm run cms`
beside `npm run dev` and open `/admin/`.

## 6. Undoing a deploy

On the server, point `current` back at the previous release:

```
cd <DEPLOY_PATH>
ls -1dt releases/*                       # newest first
ln -sfn releases/<the one before> current.new && mv -Tf current.new current
```

On a static host, use its "roll back to this deployment" button. Then fix the problem and push again.

## 7. Routine care

- **Daily:** the 00:30 IST rebuild keeps date-dependent content right. Nothing to do.
- **Weekly:** the issue opened by `weekly-external-links.yml` lists links to other websites that stopped answering and anything
  not re-confirmed for 180 days. Check each with the person who owns the fact, then update its review date in the editor.
- **When dependencies need updating:** `npm audit --omit=dev` must show nothing high or critical (CI checks). Dependabot, if
  enabled, opens the pull requests; `CLAUDE.md` and the project notes say which tool versions are deliberately pinned.
