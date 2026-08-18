# Zeyu Ren Product Motion Portfolio

An independent product-motion portfolio built from the static media and route architecture of the brand-motion site. The interface uses a compact workspace sidebar with the project gallery and case studies in the right canvas.

The original brand portfolio remains in its own repository and is not connected to this project.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev -- --port 3002
```

Open [http://localhost:3002](http://localhost:3002). Port 3000 remains assigned to the brand portfolio preview.

Useful commands:

```bash
npm run lint
npm run build
npm test
```

The static site is written to `dist/client`.

## Content

The existing nine case studies and local media are retained as the initial content set. Update `app/data/portfolio.json` when product-specific case studies are ready. Project routes are thin wrappers under `app/<slug>/page.tsx`.

The visible identity now reads “Product Motion Designer,” and the home page introduces the work as motion systems, launch stories, and interaction-focused product work.

## GitHub Pages

The static metadata and sitemap currently target:

[https://renzeyu.github.io/product-motion/](https://renzeyu.github.io/product-motion/)

If the final repository name differs, update `app/lib/site.ts`, `public/robots.txt`, `public/sitemap.xml`, and the matching static-export assertions before publishing. The included workflow automatically applies the GitHub Pages base path to generated routes and assets.

## Contact form

The About form opens the visitor’s email app and is configured for `hello@zeyuren.com` in `app/components/ContactForm.tsx`. Verify that this address forwards to the intended inbox before publishing.

## Media and fonts

- Looping motion assets use local H.264 MP4 files with poster images.
- Four former Adobe CCV videos are archived locally.
- Three longer films remain Vimeo embeds.
- Jost Variable is self-hosted through the installed package.
- Phosphor provides the workspace and social icon family.

All portfolio artwork and copy remain copyright Zeyu Ren.
