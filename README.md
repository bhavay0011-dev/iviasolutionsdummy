# ivia solutions website

Static website for **ivia solutions**, a full-service digital marketing agency. It works on GitHub Pages or any static host, and it also opens straight from a folder on your computer for previewing.

## Uploading to GitHub

1. Create a new repository (for example `ivia-website`). Keep it separate from Bidvista.
2. Choose **Add file → Upload files**, drag in **all the files in this folder**, and commit. There are no sub-folders.
3. Go to **Settings → Pages**, set *Source* to **Deploy from a branch**, then choose **main** and **/ (root)**, and save.
4. The `CNAME` file already tells GitHub the domain is **www.iviasolutions.in**. In Settings → Pages it should appear under *Custom domain*. If it doesn't, type `www.iviasolutions.in` there and save.

## Connecting iviasolutions.in (DNS)

At your domain registrar (where you bought iviasolutions.in), open the DNS settings and add:

| Type | Name / Host | Value |
|---|---|---|
| CNAME | `www` | `<your-github-username>.github.io` |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

Remove any old A or CNAME records for `@` or `www` that point somewhere else. DNS can take from a few minutes to 24 hours to update. Once it does, go back to Settings → Pages and tick **Enforce HTTPS**.

Visitors who type `iviasolutions.in` without `www` are sent to `www.iviasolutions.in` automatically.

## Turning on tracking

All tracking lives in **one file: `tracking.js`**. Open it on GitHub, click the pencil icon, paste your IDs between the quotes, and commit:

| Setting | Where to find it | Looks like |
|---|---|---|
| `GA4_ID` | Google Analytics → Admin → Data streams | `G-ABC123XYZ9` |
| `META_PIXEL_ID` | Meta Events Manager → Data sources | 15–16 digits |
| `CLARITY_ID` | Microsoft Clarity → Settings → Setup | ~10 characters |
| `GOOGLE_ADS_ID` (optional) | Google Ads → Tools → Google tag | `AW-123456789` |

Any tag left empty stays switched off. Once IDs are added, these events fire automatically:

| Action | Google Analytics | Meta Pixel |
|---|---|---|
| Every page view | page_view | `PageView` + `ViewContent` (page name) |
| Email / WhatsApp / Fiverr click | `contact_click` {method} | `Contact` {content_name} |
| Contact form sent | `generate_lead` | `Lead` |

## Contents

- **Pages:** home, services, case studies, contact, privacy, landing, 404
- **Blog:** 15 articles, covering Meta, Google, tracking, creative, strategy and 9 Amazon guides
- **Shared files:** `style.css` (design), `main.js` (motion and interactions), `tracking.js` (analytics)
- **Images:** `logo.png` / `logo-light.png` / `logo-full.png` / `logo-white.png` (wordmark variants), `favicon.png`, `apple-touch-icon.png`, `og-image.jpg` (link preview), plus the two dashboard screenshots

The contact form posts to Formspree.

Design & build — By Bhavay Sehgal & Sanket Tijare, IVIA Marketing Solutions LLP
