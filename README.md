# RES Cement Web

Offline-first React rebuild of the legacy RES Cement Delphi app. The project keeps the three core
calculation domains from the original codebase, seeds tubing/casing/hole lookup data from the
legacy INI file, stores drafts locally, and exports field reports as PDFs.

## Getting started

1. Install Node.js 18+.
2. Run `npm install`.
3. Run `npm run dev`.
4. Run `npm test` for the golden calculation tests.

## Share it live

The easiest option is Vercel:

1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com), import the repo, and deploy.
3. Vercel will use the included [`vercel.json`](/Users/ericperner/Documents/New%20project/vercel.json) and give you a public URL you can send to anyone.

Netlify will also work:

1. Push the project to GitHub.
2. Go to [netlify.com](https://netlify.com) and import the repo.
3. Netlify will use [`netlify.toml`](/Users/ericperner/Documents/New%20project/netlify.toml) and publish the `dist` output as a public site.

## Notes

- The calculation logic in [`src/lib/calculations.ts`](/Users/ericperner/Documents/New project/src/lib/calculations.ts)
  is derived from repo evidence in the legacy Delphi app at
  `/Users/ericperner/Desktop/RES Cement App/TabbedTemplate.pas`.
- The app has been verified locally with `npm test` and `npm run build`.
