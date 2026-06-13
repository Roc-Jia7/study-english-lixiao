# Point a Cloudflare-managed domain at a Vercel app

> 🌐 中文版:[cloudflare-to-vercel.md](cloudflare-to-vercel.md)

A general, reusable guide for pointing a domain whose **DNS is managed by
Cloudflare** (apex or subdomain) at an app deployed on **Vercel**, with an
automatically issued HTTPS certificate.

> Assumes the domain's nameservers are already on Cloudflare (you can edit its
> DNS in the Cloudflare dashboard) and the app is already deployed on Vercel
> (it has a `*.vercel.app` URL).

---

## Overview (one step on each side)

1. **Vercel** — add the domain to your project.
2. **Cloudflare** — add one DNS record pointing at Vercel, set to
   **DNS only (grey cloud)**.

Within a few minutes Vercel verifies it and issues a Let's Encrypt
certificate; the domain then serves over HTTPS.

---

## Step 1 · Add the domain in Vercel

**Option A — Dashboard (recommended)**

Project → **Settings → Domains** → type your domain → **Add**.
Vercel shows the DNS record you need to create — **use exactly what the page
shows** (usually the standard values below).

**Option B — CLI**

```bash
npm i -g vercel
vercel login
vercel link                 # link to the target project
vercel domains add <your-domain>
```

---

## Step 2 · Configure DNS in Cloudflare

Cloudflare → pick the domain → **DNS → Records → Add record**:

**Subdomain** (e.g. `app.example.com`)

| Field | Value |
| --- | --- |
| Type | `CNAME` |
| Name | `app` (just the subdomain label, not the full domain) |
| Target | `cname.vercel-dns.com` |
| Proxy status | **DNS only (grey cloud)** |
| TTL | Auto |

**Apex / root domain** (e.g. `example.com`)

| Field | Value |
| --- | --- |
| Type | `A` |
| Name | `@` |
| IPv4 address | `76.76.21.21` |
| Proxy status | **DNS only (grey cloud)** |
| TTL | Auto |

> For an apex you usually also add `www`: `CNAME www → cname.vercel-dns.com`
> (DNS only), then set a `www` ↔ apex redirect in Vercel's Domains page
> (either direction).
>
> Always defer to the exact values shown on Vercel's Domains page; the tables
> above are Vercel's long-standing standard values.

---

## ⚠️ Key point: use "DNS only" (grey cloud), not the orange proxy

Cloudflare's **orange-cloud proxy** puts another layer in front of Vercel's
CDN, which commonly causes:

- **ERR_TOO_MANY_REDIRECTS** — a redirect loop when the SSL mode doesn't match.
- **Certificate never issues** — the proxy intercepts Vercel's ACME (HTTP-01)
  challenge.

Click the cloud icon on the record to turn it **grey (DNS only)** so Vercel
handles TLS and CDN directly. That's the most reliable setup.

**How to tell it's grey-clouded:** the record resolves to a Vercel IP
(`76.76.x.x` / `66.33.x.x`), not a Cloudflare IP (`104.x` / `172.67.x`).

### If you really want to keep the Cloudflare proxy (orange)

It can work, but:

- **SSL/TLS → Overview → mode must be `Full (strict)`** (the default /
  Flexible causes the redirect loop).
- Prefer to **start grey-clouded**, wait until Vercel issues the cert and the
  domain shows **Valid**, then flip to orange.
- You gain Cloudflare's WAF/cache but add a second cache layer to reason about
  when debugging.

---

## Step 3 · Verify

1. Vercel's **Domains** page flips to **Valid Configuration** and issues the
   certificate automatically.
2. From a terminal:

```bash
dig +short app.example.com          # expect: cname.vercel-dns.com → Vercel IP
curl -sSI https://app.example.com   # expect: HTTP/2 200 and server: Vercel
```

`server: Vercel` + `200` + no certificate error = success.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `ERR_TOO_MANY_REDIRECTS` | Orange cloud + SSL=Flexible. Set `Full (strict)`, or switch to grey. |
| Certificate stuck pending / not issued | Orange cloud blocked the ACME challenge. Switch to grey, wait a few minutes. |
| `dig` returns nothing / NXDOMAIN | Record not saved, Name has the full domain (should be just the label), or DNS hasn't propagated yet (wait a few minutes). |
| Banner "Vercel recommends updating your DNS records" | Non-blocking **suggestion** (often: switch an apex to an A record). If it's already Valid and returns 200, ignore it. |
| Apex works but `www` doesn't (or vice versa) | Add records for both and set a redirect in Vercel. |
| Resolves to a Cloudflare IP (`104.x` / `172.67.x`) | Still orange-clouded. Click the cloud to make it grey. |
| Domain breaks after moving projects | A domain can attach to only one Vercel project at a time; remove it from the old project, then Add it on the new one. |

---

## Real example from this repo

- **App:** `study-english-lixiao` (Vercel team `roc-jia7s-projects`)
- **Custom domain:** `lxll-study.pigent.top`
- **Cloudflare record:** `CNAME lxll-study → cname.vercel-dns.com`, **DNS only
  (grey cloud)**
- **Verification:**
  - `dig +short lxll-study.pigent.top` → `cname.vercel-dns.com.` →
    `76.76.21.93` / `66.33.60.194`
  - `curl -sSI https://lxll-study.pigent.top` → `HTTP/2 200`, `server: Vercel`,
    HSTS enabled
- The `*.vercel.app` URLs stay live; every push to `main` auto-deploys and the
  custom domain follows.
