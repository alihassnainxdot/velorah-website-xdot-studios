# XDOT®

A minimalist, cinematic single-page web experience built with React, TypeScript, Vite, Tailwind CSS, and `shadcn/ui`.

- **Live Preview:** https://xdotstudios.vercel.app
- **Contact:** xdotstudios@proton.me (24 / 7)

## Features

- Fullscreen looping ambient video backdrop with deep navy HSL theme
- Glassmorphic navigation bar with responsive mobile drawer (`Studio`, `About`, `Journal`, `Reach Us`)
- `Instrument Serif` + `Inter` typography pairing with staggered `IntersectionObserver` fade-rise reveals
- Custom fine-pointer circular cursor with smooth interpolation and hover scaling
- Interactive early-access request dialog with inline form validation
- SEO metadata (`OpenGraph`, Twitter Cards, Schema.org JSON-LD, `robots.txt`, `sitemap.xml`)

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

## Custom Domain & Google Search Setup

1. After claiming your `.is-a.dev` subdomain, replace `https://xdotstudios.vercel.app` in `index.html`, `public/robots.txt`, and `public/sitemap.xml` with your final domain.
2. Add your Google Search Console verification `<meta name="google-site-verification" ... />` tag in `index.html`.
3. Push to GitHub—Vercel automatically rebuilds and deploys.
