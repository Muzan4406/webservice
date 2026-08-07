---
name: PWA cache policy
description: Cache rules required to keep installed Muzan Service clients from loading stale bundles
---

# PWA cache policy

Installed clients must revalidate the HTML app shell, manifest, and service worker after deployments. Cache-busting hashed assets is safe, but serving stale HTML can reference a removed JavaScript chunk and produce a blank installed app.

**Why:** A previous cache-first app shell allowed an installed PWA to keep an old `index.html` after a Vite deployment changed the hashed bundle name.

**How to apply:** Keep navigations network-first with an offline shell fallback, increment the service-worker cache name when its strategy changes, register it with `updateViaCache: "none"`, and send `no-cache` headers for PWA control files.