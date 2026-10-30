/* =====================================================================
   ivia solutions — analytics & ad tracking (shared by every page)

   HOW TO TURN TRACKING ON
   1. Paste your IDs between the quotes below.
   2. Commit the file. Every page picks it up automatically.
   Leave an ID empty ('') to keep that tag switched off.
   ===================================================================== */
var IVIA_TRACKING = {
  GA4_ID:        '',   // Google Analytics 4 measurement ID, looks like 'G-ABC123XYZ9'
  META_PIXEL_ID: '',   // Meta (Facebook & Instagram) Pixel ID, 15–16 digits
  CLARITY_ID:    '',   // Microsoft Clarity project ID, about 10 letters/numbers
  GOOGLE_ADS_ID: ''    // Optional: Google Ads tag ID, looks like 'AW-123456789'
};

/* ---------- nothing below this line needs editing ---------- */
(function () {
  var T = IVIA_TRACKING, s = document.currentScript;
  var page = (s && s.getAttribute('data-page')) || document.title;
  function id(v) { return (v || '').replace(/\s+/g, ''); }
  var GA = id(T.GA4_ID), ADS = id(T.GOOGLE_ADS_ID), PX = id(T.META_PIXEL_ID), CL = id(T.CLARITY_ID);

  // Google Analytics 4 / Google Ads (gtag.js)
  if (GA || ADS) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    var g = document.createElement('script'); g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + (GA || ADS);
    document.head.appendChild(g);
    if (GA) gtag('config', GA);
    if (ADS) gtag('config', ADS);
  }

  // Microsoft Clarity
  if (CL) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CL);
  }

  // Meta Pixel
  if (PX) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PX);
    fbq('track', 'PageView');
    fbq('track', 'ViewContent', { content_name: page });
  }
})();
/* Click & lead events (fired from main.js):
   email / WhatsApp / Fiverr clicks -> GA4 'contact_click' + Meta 'Contact'
   contact form sent               -> GA4 'generate_lead' + Meta 'Lead'      */
