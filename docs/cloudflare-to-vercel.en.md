# Point your own domain at a Vercel site (Cloudflare DNS) — a 0-to-1 guide

> 🌐 中文版:[cloudflare-to-vercel.md](cloudflare-to-vercel.md)

**What you'll achieve:** people can open your Vercel-hosted site at your own
domain (e.g. `lxll-study.pigent.top`), with an automatic HTTPS padlock 🔒.

**Who it's for:** anyone — no prior domain/DNS experience required.
**How long:** ~10–20 minutes of clicking; then a few minutes to ~an hour for DNS to take effect.
**Cost:** Cloudflare's free plan + Vercel's free Hobby plan are enough (only *buying the domain* costs money).

---

## 0 · Understand what you're doing (background)

You have a site deployed on **Vercel**. By default it gives you an address
like `xxx.vercel.app`. That works, but it's not memorable or "yours" — so you
want to use a domain you bought instead.

A domain's "directions" are handled by **DNS**, and this guide assumes you use
**Cloudflare** to manage that DNS (popular because it's free, fast, and adds
protection).

The final request path looks like this:

```
  Browser opens your domain
        │
        ▼
  Cloudflare DNS  ──(one record: CNAME / A)──►  Vercel
        │                                         │
        └─────────────────────────────────────────┘
                          │
                          ▼
              Vercel serves your site (auto HTTPS)
```

So you really do just **two things**:
1. In **Vercel**, say: "this domain is mine, please accept its traffic."
2. In **Cloudflare**, add one record: "this domain points to Vercel."

---

## Mini glossary (skim it, that's enough)

| Term | One-line meaning |
| --- | --- |
| Domain | The address you bought, e.g. `example.com` |
| Subdomain | A label in front of the domain, e.g. `app.example.com` (`app` is the subdomain part) |
| Apex / root | The bare domain `example.com` itself |
| DNS | A "phone book" that translates a domain into a server address |
| A / CNAME record | A: domain → an IP; CNAME: domain → another domain |
| Nameserver (NS) | *Who* runs this domain's DNS. To use Cloudflare, point the NS at Cloudflare |
| Proxy (orange) / DNS only (grey) | Whether Cloudflare also proxies the traffic. For Vercel, **grey is safest** |
| Propagation | DNS changes take a little while to apply worldwide (minutes to hours) |
| HTTPS certificate | Gives the 🔒 and encryption. Once wired up, **Vercel issues it automatically** |

---

## 1 · Before you start: confirm/prepare three things

> This is the "0" starting point. If any item isn't ready, fix it first.

**① You own a domain.**
If not, buy one (Cloudflare Registrar, Namecheap, etc.).

**② That domain's DNS is already managed by Cloudflare.**
Check: log in to [Cloudflare](https://dash.cloudflare.com) and you can see the
domain in your list with status **Active**.
👉 If not yet, do **"Appendix A: Bring your domain onto Cloudflare"** below, then come back.

**③ Your site is deployed on Vercel and opens at some `xxx.vercel.app`.**
If not, go to [vercel.com](https://vercel.com), import your project from GitHub,
deploy once, and confirm the `.vercel.app` URL opens.

---

## 2 · Step one: add the domain in Vercel

1. Open [vercel.com](https://vercel.com), log in → open your **project**.
2. Top menu **Settings** → left menu **Domains**.
3. Type the domain you want:
   - a subdomain, e.g. `app.example.com` (recommended, simplest); or
   - the root domain, e.g. `example.com`.
4. Click **Add**.
   - If Vercel offers choices (e.g. "Add" / "Redirect"), choose to **add it to this project**.
   - It may ask whether to hand the whole domain's DNS to Vercel — **no**; we keep DNS on Cloudflare and just add one record.
5. After adding, Vercel shows a note: **"add this record to your DNS"** (usually
   exactly the values in the next step). The domain will likely show **Invalid
   Configuration / Misconfigured** — **that's normal**; it fixes itself once you
   add the Cloudflare record.

> Command line alternative (optional):
> ```bash
> npm i -g vercel
> vercel login
> vercel link                 # link to the target project
> vercel domains add <your-domain>
> ```

---

## 3 · Step two: add one DNS record in Cloudflare

1. Log in to [Cloudflare](https://dash.cloudflare.com) → open your domain →
   left menu **DNS → Records** → **Add record**.
2. Fill it in per your case:

**Case A · Using a subdomain** (e.g. `app.example.com`)

| Field | Value |
| --- | --- |
| Type | `CNAME` |
| Name | `app` (**just the subdomain label**, not the full domain) |
| Target | `cname.vercel-dns.com` |
| Proxy status | **DNS only (grey cloud)** |
| TTL | Auto |

**Case B · Using the root/apex** (e.g. `example.com`)

| Field | Value |
| --- | --- |
| Type | `A` |
| Name | `@` (means the root domain itself) |
| IPv4 address | `76.76.21.21` |
| Proxy status | **DNS only (grey cloud)** |
| TTL | Auto |

> With a root domain you usually also add `www`: a `CNAME` `www` →
> `cname.vercel-dns.com` (also grey), then set a redirect between `www` and the
> apex on Vercel's Domains page (either direction).

3. **The key step: make the proxy grey.** In the proxy-status column there's a
   cloud icon, often **orange (proxied)** by default — **click it so it turns
   grey ("DNS only")**.
4. Click **Save**.

> ⚙️ The tables above are Vercel's long-standing standard values. If Vercel's
> Domains page shows you a different target, **use what Vercel shows**.

---

## ⚠️ Why grey cloud, never orange?

Cloudflare's **orange cloud = proxy on**, which puts another layer in front of
Vercel's own CDN. With Vercel that often breaks things:

- **ERR_TOO_MANY_REDIRECTS** (the page just keeps redirecting and won't load).
- **The HTTPS certificate never issues** (orange cloud blocks the request Vercel
  uses to prove you own the domain).

So make the cloud **grey (DNS only)** and let Vercel handle CDN + HTTPS directly
— simplest and least error-prone.

**How to confirm it's grey:** the domain resolves to a Vercel IP
(`76.76.x.x` / `66.33.x.x`), not a Cloudflare IP (`104.x` / `172.67.x`).

<details>
<summary>I really want to keep Cloudflare's proxy (orange). (advanced, skippable)</summary>

It can work, but:
- In Cloudflare **SSL/TLS → Overview**, set the mode to **`Full (strict)`**
  (the default / Flexible causes the redirect loop above).
- Prefer to **start grey**, wait until Vercel issues the cert and the domain is
  **Valid**, then switch to orange.
- You gain Cloudflare's WAF/cache, but add a second cache layer — future
  debugging means checking both Cloudflare and Vercel.
</details>

---

## 4 · Step three: wait + verify

1. **Wait a few minutes** (sometimes longer). DNS changes need time to propagate.
2. Back on Vercel's **Domains** page, the status flips from Invalid to **Valid
   Configuration**, and it **issues the HTTPS certificate automatically**.
3. **Simplest check:** open `https://your-domain` in a browser. If your site
   loads with a 🔒 in the address bar = **success!**

Optional deeper checks (pick one):

- **Online tool:** open [dnschecker.org](https://dnschecker.org), enter your
  domain, and see whether it resolves to Vercel worldwide.
- **Windows** (Command Prompt / PowerShell):
  ```powershell
  nslookup your-domain
  ```
  Expect to see `cname.vercel-dns.com` or a Vercel IP in the result.
- **macOS / Linux** (terminal):
  ```bash
  dig +short your-domain          # expect: cname.vercel-dns.com → Vercel IP
  curl -sSI https://your-domain   # expect: HTTP/2 200, and header server: Vercel
  ```

---

## 5 · Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Domain never becomes **Active** in Cloudflare | Nameservers at the registrar aren't changed correctly or haven't propagated. Re-check you entered Cloudflare's two NS values, then wait. |
| Browser just spins / won't open | DNS hasn't propagated yet. Wait a few minutes; try another network/mobile data; flush your local DNS cache if needed. |
| `ERR_TOO_MANY_REDIRECTS` | Orange cloud + SSL=Flexible. Switch the record to **grey**, or set Cloudflare SSL to `Full (strict)`. |
| Certificate stuck pending in Vercel | Usually orange cloud blocking verification. Switch to **grey**, wait a few minutes. |
| `nslookup`/`dig` returns nothing / NXDOMAIN | Record not saved, **Name set to the full domain** (a subdomain should be just the label), or not propagated yet. |
| Banner "Vercel recommends updating your DNS records" | A **non-blocking suggestion** (often: switch an apex to an A record). If it's already Valid and the site loads, ignore it. |
| Apex works but `www` doesn't (or vice versa) | Add DNS records for both and set a redirect on Vercel. |
| Resolves to a Cloudflare IP (`104.x` / `172.67.x`) | Still orange. Click the record's cloud to make it **grey**. |
| Domain was used in another Vercel project and won't add | A domain attaches to only one Vercel project at a time. Remove it from the old project, then Add it on the current one. |

---

## 6 · Done checklist

- [ ] Domain shows **Active** in Cloudflare
- [ ] Domain is **added** under Vercel project → Settings → Domains
- [ ] Cloudflare has the matching **CNAME (subdomain) / A (apex)** record, set to **grey (DNS only)**
- [ ] Vercel domain status is **Valid Configuration**, certificate issued
- [ ] `https://your-domain` opens your site with a 🔒

All checked = you're done 🎉

---

## Appendix A · Bring your domain onto Cloudflare (if step 1② isn't ready)

If your domain's DNS isn't on Cloudflare yet:

1. Log in to [Cloudflare](https://dash.cloudflare.com) → top right **Add a
   site** → enter your **root domain** (`example.com`) → choose the **Free** plan.
2. Cloudflare scans your existing DNS records and gives you **two nameservers**
   like `xxx.ns.cloudflare.com`. Note them down.
3. Go to your **registrar** (where you bought the domain: Namecheap / GoDaddy /
   etc.) → find that domain's **Nameservers** setting → replace the existing two
   with Cloudflare's two → save.
4. Back in Cloudflare, wait until the domain becomes **Active** (minutes to
   hours). **Only after Active**, return to "Step one" above.

> If you bought the domain at **Cloudflare Registrar**, it's already on
> Cloudflare — **skip Appendix A**.

---

## Appendix B · Real example from this repo

- **App:** `study-english-lixiao` (Vercel team `roc-jia7s-projects`)
- **Custom domain:** `lxll-study.pigent.top` (a subdomain)
- **Cloudflare record:** `CNAME` `lxll-study` → `cname.vercel-dns.com`, **DNS only (grey cloud)**
- **Verified:**
  - `dig +short lxll-study.pigent.top` → `cname.vercel-dns.com.` → `76.76.21.93` / `66.33.60.194`
  - `curl -sSI https://lxll-study.pigent.top` → `HTTP/2 200`, `server: Vercel`, HSTS on
- The `*.vercel.app` URLs stay live; every push to `main` auto-deploys and the
  custom domain follows.
