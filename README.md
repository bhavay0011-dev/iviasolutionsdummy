# ivia solutions website (v3)

Static website for **ivia solutions** (a brand of IVIA Marketing Solutions LLP). It works on GitHub Pages or any static host, and it also opens straight from a folder on your computer for previewing.

**New in v3**
- **Bidvista by ivia**, ivia's marketplace AI (early access), is at `bidvista.html`. Visitors who type `iviasolutions.in/bidvista` land there automatically.
- **Nine dedicated service pages**, each with its own free calculator, FAQ and process:
  - Meta Ads, Google Ads and Marketplaces (Amazon, Flipkart)
  - Creative, Social Media and SEO
  - Websites, Analytics & Tracking, and Email & WhatsApp
- **Ivvy, the chat assistant, on every page.**
  - It answers from ivia's own knowledge straight away, with no setup.
  - It can calculate bids and breakevens.
  - It captures leads.
  - It can be switched to full AI answers (see below).
- **Full measurement.** Every lead now records where the visitor came from, and every important click, form, chat and calculator is tracked.
- **Services mega-menu** on desktop, and a services list inside the mobile menu.
- **New footer credit:** By Bhavay Sehgal & Sanket Tijare, IVIA Marketing Solutions LLP.

## Uploading to GitHub

1. Open the **iviasolutionsdummy** repository and choose **Add file → Upload files**.
2. Drag in **all the files in this folder** (there are no sub-folders) and commit. Files with the same name are replaced. Nothing needs deleting.
3. That's it. The `CNAME` file keeps the domain as **www.iviasolutions.in**, and the DNS you already set up keeps working.

## Tracking

Tracking is **already switched on** with the same IDs as Bidvista:
- GA4: `G-GDV2GVXPKS`
- Meta Pixel: `1299160462262289`
- Clarity: `vr3gfchndq`

Both websites therefore report into the same accounts. To tell them apart:
- **GA4:** add the *Hostname* dimension, or a comparison, where `www.iviasolutions.in` is ivia and `bidvista.org` is Bidvista.
- **Clarity:** filter by URL.
- **Meta:** if Events Manager ever shows *Traffic permissions* blocking a domain, add `iviasolutions.in` to the allow list.

All IDs live in **one file: `tracking.js`**. To change them, open it on GitHub, click the pencil icon, edit the IDs between the quotes, and commit.

| Setting | Where to find it | Looks like |
|---|---|---|
| `GA4_ID` | Google Analytics → Admin → Data streams | `G-ABC123XYZ9` |
| `META_PIXEL_ID` | Meta Events Manager → Data sources | 15–16 digits |
| `CLARITY_ID` | Microsoft Clarity → Settings → Setup | ~10 characters |
| `GOOGLE_ADS_ID` (optional) | Google Ads → Tools → Google tag | `AW-123456789` |
| `GOOGLE_ADS_LEAD_LABEL` (optional) | Google Ads → Goals → your lead conversion → Tag setup. It's the part after the `/` in `send_to` | `AbC-D_efGhIjKl` |
| `GTM_ID` (optional) | Google Tag Manager, only if you use it | `GTM-XXXXXXX` |

Any tag left empty stays switched off. Google Ads and GTM are empty for now.

### Check it works

Add `?debug_tracking=1` to any address, for example `https://www.iviasolutions.in/?debug_tracking=1`.

- A panel appears bottom-left showing every event as it fires and which tools received it.
- It stays on while you browse. `?debug_tracking=0` turns it off.
- Your own debug visits are marked `traffic_type=internal` in GA4, so you can filter them out. To do that, go to **Admin → Data filters** and activate the *Internal traffic* filter.

You can also check each tool directly:
- **GA4:** Reports → Realtime.
- **Meta:** Events Manager → Test events.
- **Clarity:** recordings appear within about an hour.

## Measurement plan

These events fire automatically:

| Event | When it fires | Details sent | Meta Pixel |
|---|---|---|---|
| `page_view` | Every page (GA4 automatic) | page title | `PageView` + `ViewContent` |
| `view_service` | A service page is viewed | `service` (meta, google, amazon…) | `ViewContent` |
| `scroll_depth` | 25 / 50 / 75 / 90% of a page scrolled | `percent` | – |
| `cta_click` | Any button is clicked | `label`, `destination`, `location` | custom |
| `contact_click` | Email, phone, WhatsApp or Fiverr link clicked | `method`, `location` | `Contact` |
| `outbound_click` | A link to another website is clicked | `url` | – |
| `form_start` | First click into a form | `form_id` | custom |
| **`generate_lead`** | Contact form, Bidvista waitlist or chat lead sent | `method`: contact_form / bidvista_waitlist / chat, plus `service` | **`Lead`**, plus the Google Ads conversion |
| `bidvista_waitlist` | Someone joins the Bidvista waitlist | `method` | `CompleteRegistration` |
| `calculator_use` | A calculator or the tracking checklist is used (once per tool) | `calculator` | custom |
| `faq_open` | An FAQ is opened | `question` | – |
| `blog_filter` | A blog category is chosen | `category` | – |
| `article_read` | A reader reaches the end of an article | `article`, `seconds` | custom |
| `chat_open` | The chat is opened | `via`, `persona` | custom |
| `chat_message` | A message is sent in the chat. The message text is never sent, only its length and mode. | `mode`, `via` | custom |
| `chat_quick_reply` | A suggested question is tapped | `label` | – |
| `chat_unanswered` | The assistant couldn't answer. Emails and numbers are removed. | `question` | – |
| `chat_lead` / `chat_handoff` | Details left in chat / "Talk to a human" tapped | `method` | custom |

Microsoft Clarity receives every event too, so you can filter recordings by them, for example "show sessions with generate_lead".

**Recommended setup in the tools**
- **GA4:** mark `generate_lead` as a **key event**, and optionally `bidvista_waitlist` too. Register `method`, `service`, `calculator`, `location`, `label` and `persona` as event-scoped custom dimensions under **Admin → Custom definitions**, so they appear in reports.
- **Meta:** optimise lead campaigns for **Lead**. For Bidvista campaigns, use **CompleteRegistration**.
- **Google Ads:** create a "Lead" conversion action and paste its label into `GOOGLE_ADS_LEAD_LABEL`.

**Lead attribution.** Every contact-form, waitlist and chat lead that reaches your inbox (via Formspree) now includes:
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term` and `utm_content`
- `gclid` or `fbclid`, when present
- the `landing_page` and `referrer`
- the **first-ever visit's** source, in the `first_…` fields
- `pages_viewed` and `lead_page`

So you can see which campaign produced each lead, even before analytics is set up. Use UTM links on every ad, for example `?utm_source=meta&utm_medium=paid&utm_campaign=audit_offer`.

**Improve the chat over time.** In GA4, look at `chat_unanswered` to see what people ask that the assistant couldn't answer, then add those answers to `chat-kb.js`.

## Ivvy, the chat assistant

- **Works now, free.** Answers come from `chat-kb.js`, which is ivia's services, pricing approach, FAQs, results, marketing terms and Bidvista.
- **Built-in calculators.** It works out target CPC, breakeven ROAS/ACOS and ACOS⇄ROAS from numbers typed in the chat.
- **Lead capture.** It offers a quick form (name + email or WhatsApp), sent to the same Formspree inbox with the conversation attached.
- **Ivvy on every page.** On the Bidvista page, Ivvy leads with Bidvista and marketplace questions and offers early access. Clicking the robot on the home page also opens Ivvy.
- **AI answers (optional).**
  1. Set up the free connector in **ivia-chatbot-ai-connector.zip**. It takes about 10 minutes and the steps are inside.
  2. Paste its address into `AI_URL` at the top of `chatbot.js`.
  3. Your AI key stays inside the connector and never reaches the website.
  4. If the AI is ever unavailable, the chat quietly falls back to the built-in answers.
- **Editing answers.** Each entry in `chat-kb.js` has a question list (`q`), keywords (`k`) and an answer (`a`), and you can edit the answer text there. It's generated from the site content, so ask for the build to be re-run when services change.

## Shared with Bidvista for now

- **Email:** `connect@bidvista.org` is used everywhere on the site, in Ivvy and in Ivvy's answers.
- **Forms:** contact, waitlist and Ivvy leads all go to the same Formspree inbox as Bidvista (`xykngvlj`). Each email's subject says where it came from, for example "New ivia solutions enquiry", "Bidvista early access" or "New ivia chat lead".

## Contents

- **Pages:**
  - home and services
  - 10 service pages: `meta-ads`, `google-ads`, `marketplaces`, `creative`, `social-media`, `seo`, `websites`, `analytics-tracking`, `marketing-mix-modelling` (short link: `/mmm`), `email-whatsapp`
  - `bidvista`, case studies, blog (15 articles), contact, privacy, landing and 404
- **Shared files:** `style.css` (design), `main.js` (motion and interactions), `tracking.js` (analytics and measurement), `chatbot.js` (Ivvy) and `chat-kb.js` (chat knowledge).
- **Images:** `logo.png`, `logo-full.png`, `favicon.png`, `apple-touch-icon.png`, `og-image.jpg` and the two dashboard screenshots.

By Bhavay Sehgal & Sanket Tijare, IVIA Marketing Solutions LLP
