# 将 Cloudflare 托管的域名指向 Vercel 应用

> 🌐 English: [cloudflare-to-vercel.en.md](cloudflare-to-vercel.en.md)

一份通用、可复用的操作指引:把一个 **DNS 托管在 Cloudflare** 的域名(根域名或子域名)指向部署在 **Vercel** 上的应用,并拿到自动签发的 HTTPS 证书。

> 适用前提:域名的 nameserver 已经在 Cloudflare(在 Cloudflare 后台能管理它的 DNS),应用已经部署在 Vercel(有一个 `*.vercel.app` 地址)。

---

## 总览(两边各一步)

1. **Vercel**:在项目里"添加域名"。
2. **Cloudflare**:加一条 DNS 记录指向 Vercel,并设为 **DNS only(灰云)**。

几分钟后 Vercel 自动验证并签发 Let's Encrypt 证书,域名即可用 HTTPS 访问。

---

## 步骤一 · 在 Vercel 添加域名

**方式 A — 控制台(推荐)**

项目 → **Settings → Domains** → 输入你的域名 → **Add**。
Vercel 会显示"需要在 DNS 配置的记录值",**以页面显示为准**(一般就是下表的标准值)。

**方式 B — CLI**

```bash
npm i -g vercel
vercel login
vercel link                 # 关联到目标项目
vercel domains add <你的域名>
```

---

## 步骤二 · 在 Cloudflare 配置 DNS

Cloudflare → 选择域名 → **DNS → Records → Add record**,按用法选:

**子域名**(如 `app.example.com`)

| 字段 | 值 |
| --- | --- |
| Type | `CNAME` |
| Name | `app`(只填子域名那一段,别填完整域名) |
| Target | `cname.vercel-dns.com` |
| Proxy status | **DNS only(灰云)** |
| TTL | Auto |

**根 / 裸域名**(如 `example.com`)

| 字段 | 值 |
| --- | --- |
| Type | `A` |
| Name | `@` |
| IPv4 address | `76.76.21.21` |
| Proxy status | **DNS only(灰云)** |
| TTL | Auto |

> 裸域名通常再加一个 `www`:`CNAME www → cname.vercel-dns.com`(DNS only),并在 Vercel 的 Domains 里设置 `www` ↔ 裸域名 的重定向(谁跳谁随意)。
>
> 以 Vercel Domains 页给出的具体值为准;上表是 Vercel 长期使用的标准值。

---

## ⚠️ 关键:用"灰云(DNS only)",不要橙色代理

Cloudflare 的**橙云代理**会在 Vercel 的 CDN 前再套一层,常见后果:

- **ERR_TOO_MANY_REDIRECTS** —— SSL 模式不匹配导致的重定向死循环。
- **证书一直签不出来** —— 橙云会拦截 Vercel 的 ACME(HTTP-01)验证。

点一下记录上的云朵图标,把它变成**灰色(DNS only)**,让 Vercel 直接接管 TLS + 加速,最稳。

**怎么判断是不是灰云**:解析出来的 IP 是 Vercel 的(`76.76.x.x` / `66.33.x.x`),而不是 Cloudflare 的(`104.x` / `172.67.x`)。

### 如果确实要保留 Cloudflare 代理(橙云)

可行,但要注意:

- **SSL/TLS → Overview → 模式必须设为 `Full (strict)`**(默认/Flexible 会死循环)。
- 建议**先用灰云**,等 Vercel 把证书签出来、域名状态变 **Valid**,再切橙云。
- 这样你会得到 Cloudflare 的 WAF/缓存,但多一层缓存,排障时需同时考虑两边。

---

## 步骤三 · 验证

1. Vercel 的 **Domains** 页面变成 **Valid Configuration**,并自动签发证书。
2. 命令行自检:

```bash
dig +short app.example.com          # 期望:cname.vercel-dns.com → Vercel IP
curl -sSI https://app.example.com   # 期望:HTTP/2 200 且 server: Vercel
```

看到 `server: Vercel` + `200` + 无证书报错 = 成功。

---

## 常见问题排查

| 现象 | 原因 / 解决 |
| --- | --- |
| `ERR_TOO_MANY_REDIRECTS` | 橙云 + SSL=Flexible。改 `Full (strict)`,或切灰云。 |
| 证书一直 pending / not issued | 橙云拦了 ACME 验证。切灰云,等几分钟。 |
| `dig` 解析不到 / NXDOMAIN | 记录没保存、Name 填了完整域名(应只填子段)、或 DNS 还没传播(等几分钟)。 |
| 横幅 "Vercel recommends updating your DNS records" | 非阻塞**建议**(常建议把裸域名改成 A 记录)。当前已 Valid + 出 200 即可忽略。 |
| 裸域名能开、`www` 打不开(或反之) | 两个都要加记录,并在 Vercel 设重定向。 |
| 解析到 Cloudflare IP(`104.x` / `172.67.x`) | 还是橙云。把云朵点成灰色。 |
| 换了项目后域名失效 | 一个域名同时只能绑一个 Vercel 项目;在旧项目里移除后再到新项目 Add。 |

---

## 本仓库的真实实例

- **应用**:`study-english-lixiao`(Vercel team `roc-jia7s-projects`)
- **自定义域名**:`lxll-study.pigent.top`
- **Cloudflare 记录**:`CNAME lxll-study → cname.vercel-dns.com`,**DNS only(灰云)**
- **验证结果**:
  - `dig +short lxll-study.pigent.top` → `cname.vercel-dns.com.` → `76.76.21.93` / `66.33.60.194`
  - `curl -sSI https://lxll-study.pigent.top` → `HTTP/2 200`,`server: Vercel`,HSTS 已开
- `*.vercel.app` 地址保留;每次 push 到 `main` 自动部署,自定义域名同步更新。
