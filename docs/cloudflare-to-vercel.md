# 把自己的域名指向 Vercel 网站(Cloudflare DNS)— 从 0 到 1 完整指引

> 🌐 English: [cloudflare-to-vercel.en.md](cloudflare-to-vercel.en.md)

**读完你能做到**:让别人用你自己的域名(例如 `lxll-study.pigent.top`)打开你部署在 Vercel 上的网站,并自动带上 HTTPS 小锁🔒。

**适合谁**:完全没配过域名/DNS 也能照着做。
**大概要多久**:手动操作 10–20 分钟;之后等 DNS 生效几分钟到几十分钟。
**要花钱吗**:Cloudflare 免费套餐 + Vercel Hobby 免费即可(只有「买域名」本身花钱)。

---

## 0 · 先搞懂在干什么(背景)

你有一个网站已经部署在 **Vercel**,它默认给了你一个地址,长这样:`xxx.vercel.app`。
这个地址能用,但不好记、也不像"自己的"。于是你想换成自己买的域名来访问。

**域名的"指路"工作由 DNS 完成**,而本指引假设你用 **Cloudflare** 来管理 DNS(很多人用它,因为免费、快、自带防护)。

最终的访问链路是这样的:

```
  浏览器输入你的域名
        │
        ▼
  Cloudflare 的 DNS  ──(一条记录:CNAME / A)──►  Vercel
        │                                          │
        └──────────────────────────────────────────┘
                          │
                          ▼
              Vercel 返回你的网站(自动 HTTPS)
```

你要做的,本质上就是**两件事**:
1. 在 **Vercel** 里告诉它:"这个域名是我的,请接收它的访问。"
2. 在 **Cloudflare** 里加一条记录:"这个域名,请指向 Vercel。"

---

## 名词速查(看不懂先扫一眼,够用就行)

| 名词 | 一句话解释 |
| --- | --- |
| 域名 domain | 你买的网址,如 `example.com` |
| 子域名 subdomain | 域名前面再加一段,如 `app.example.com`(`app` 就是子域名那段) |
| 根 / 裸域名 apex/root | 不带前缀的主域名 `example.com` 本身 |
| DNS | 一本"电话簿":把域名翻译成服务器地址 |
| 记录 A / CNAME | A:域名 → 一个 IP;CNAME:域名 → 另一个域名 |
| Nameserver(NS) | "这个域名的 DNS 由谁来管"。想用 Cloudflare 管,就把 NS 指到 Cloudflare |
| 代理(橙云)/ DNS only(灰云) | Cloudflare 是否也把流量代理一遍。接 Vercel **用灰云最稳** |
| 传播 propagation | DNS 的改动在全网生效需要一点时间(几分钟~数小时) |
| HTTPS 证书 | 让网址带🔒、加密传输。接好后 **Vercel 自动签发**,你不用管 |

---

## 1 · 开始前,确认/准备三样东西

> 这是"0 的起点"。任何一条没就绪,先补齐再往下走。

**① 你有一个域名。**
没有就先去买一个:Cloudflare Registrar、Namecheap、阿里云/腾讯云等都行。

**② 这个域名的 DNS 已经在 Cloudflare 管理。**
判断方法:登录 [Cloudflare](https://dash.cloudflare.com) 后,能在列表里看到这个域名、状态是 **Active**。
👉 如果还没有,见下面 **「附录 A:把域名接入 Cloudflare」**,做完再回来。

**③ 你的网站已经部署在 Vercel,有一个能打开的 `xxx.vercel.app`。**
没有就先去 [vercel.com](https://vercel.com) 用 GitHub 导入你的项目并部署一次,确认那个 `.vercel.app` 地址能正常打开。

---

## 2 · 第一步:在 Vercel 添加域名

1. 打开 [vercel.com](https://vercel.com) 并登录 → 点进你的**项目**。
2. 顶部点 **Settings** → 左侧菜单点 **Domains**。
3. 在输入框里填你想用的域名:
   - 子域名,例如 `app.example.com`(推荐,最省事);或
   - 根域名,例如 `example.com`。
4. 点 **Add**。
   - 如果 Vercel 弹出几种方式(如 "Add"/"Redirect"),选把它**加到当前项目**;
   - 它可能问要不要把整个域名的 DNS 也交给 Vercel 管——**不用**,我们的 DNS 留在 Cloudflare,只加一条记录即可。
5. 添加后,Vercel 会显示一段提示:**"请到你的 DNS 里加这样一条记录"**(通常就是下一步表格里的值)。
   此时域名状态多半显示 **Invalid Configuration / Misconfigured**——**这是正常的**,等你在 Cloudflare 加完记录就会自动变好。

> 也可以用命令行(可选,会用再用):
> ```bash
> npm i -g vercel
> vercel login
> vercel link                 # 关联到目标项目
> vercel domains add <你的域名>
> ```

---

## 3 · 第二步:在 Cloudflare 加一条 DNS 记录

1. 登录 [Cloudflare](https://dash.cloudflare.com) → 点进你的域名 → 左侧 **DNS → Records** → 点 **Add record**。
2. 按你的用法,照下表填:

**情况 A · 用子域名**(如 `app.example.com`)

| 字段 | 填什么 |
| --- | --- |
| Type | `CNAME` |
| Name | `app`(**只填子域名那一段**,不要填完整域名) |
| Target / 目标 | `cname.vercel-dns.com` |
| Proxy status / 代理状态 | **DNS only(灰色云朵)** |
| TTL | Auto |

**情况 B · 用根 / 裸域名**(如 `example.com`)

| 字段 | 填什么 |
| --- | --- |
| Type | `A` |
| Name | `@`(代表根域名本身) |
| IPv4 address | `76.76.21.21` |
| Proxy status | **DNS only(灰色云朵)** |
| TTL | Auto |

> 用根域名时,通常再加一个 `www`:`CNAME` `www` → `cname.vercel-dns.com`(同样灰云),
> 然后在 Vercel 的 Domains 页把 `www` 和裸域名互相设个跳转(谁跳谁随意)。

3. **关键一步:把"代理状态"点成灰云。** Name/Target 右边那一列有个云朵图标,默认可能是**橙色(已代理)**——**点一下让它变成灰色("DNS only")**。
4. 点 **Save** 保存。

> ⚙️ 上表是 Vercel 长期使用的标准值。如果 Vercel 的 Domains 页给你显示的目标值不一样,**以 Vercel 页面显示的为准**。

---

## ⚠️ 为什么一定要"灰云",不要橙云?

Cloudflare 的**橙色云朵 = 开启代理**,会在 Vercel 自己的 CDN 前面再套一层。接 Vercel 时这常常出问题:

- **ERR_TOO_MANY_REDIRECTS**(打开网址一直在跳转,打不开)。
- **HTTPS 证书一直签不出来**(橙云会挡住 Vercel 验证域名所有权的请求)。

所以把云朵点成**灰色(DNS only)**,让 Vercel 直接接管加速和 HTTPS,最省心、最不容易踩坑。

**怎么确认是灰云了?** 解析出来的 IP 是 Vercel 的(`76.76.x.x` / `66.33.x.x`),而不是 Cloudflare 的(`104.x` / `172.67.x`)。

<details>
<summary>我确实想保留 Cloudflare 代理(橙云)怎么办?(进阶,可跳过)</summary>

可行,但要注意:
- 到 Cloudflare 的 **SSL/TLS → Overview**,把加密模式设为 **`Full (strict)`**(默认/Flexible 会导致前面说的死循环)。
- 建议**先用灰云**,等 Vercel 把证书签好、域名状态变 **Valid**,再切回橙云。
- 你会获得 Cloudflare 的 WAF/缓存,但多了一层缓存,以后排查问题要同时看 Cloudflare 和 Vercel 两边。
</details>

---

## 4 · 第三步:等待 + 验证

1. **等几分钟**(有时更久)。DNS 改动需要时间在全网生效。
2. 回到 Vercel 的 **Domains** 页面:状态会从 Invalid 变成 **Valid Configuration**,并**自动签发 HTTPS 证书**。
3. **最简单的验证**:浏览器直接打开 `https://你的域名`。能看到你的网站、地址栏有🔒 = **成功!**

进阶验证(可选,任选其一):

- **在线工具**:打开 [dnschecker.org](https://dnschecker.org),输入你的域名,看全球各地是否都解析到了 Vercel。
- **Windows**(命令提示符 / PowerShell):
  ```powershell
  nslookup 你的域名
  ```
  期望看到结果里有 `cname.vercel-dns.com` 或 Vercel 的 IP。
- **macOS / Linux**(终端):
  ```bash
  dig +short 你的域名          # 期望:cname.vercel-dns.com → Vercel IP
  curl -sSI https://你的域名   # 期望:HTTP/2 200,且响应头里 server: Vercel
  ```

---

## 5 · 出问题怎么办(排障表)

| 现象 | 原因 / 解决 |
| --- | --- |
| Cloudflare 里域名一直不是 Active | 注册商那边的 **Nameserver 没改对**或还没生效。回去核对是否填了 Cloudflare 给的两个 NS,然后耐心等。 |
| 浏览器打开一直转 / 打不开 | DNS 还没传播。等几分钟;或换个网络/手机流量试;必要时清一下本机 DNS 缓存。 |
| `ERR_TOO_MANY_REDIRECTS`(一直跳转) | 橙云 + SSL=Flexible。把记录切**灰云**,或把 Cloudflare SSL 改 `Full (strict)`。 |
| Vercel 里证书一直 pending / 不签发 | 多半是橙云挡了验证。切**灰云**,等几分钟。 |
| `nslookup`/`dig` 查不到 / NXDOMAIN | 记录没保存成功、**Name 填成了完整域名**(子域名应只填那一段)、或还没传播。 |
| 横幅 "Vercel recommends updating your DNS records" | 这是**非阻塞建议**(常建议把裸域名换成 A 记录)。只要已 Valid 且网站能打开,可以忽略。 |
| 裸域名能开、`www` 打不开(或反过来) | 两个都要加 DNS 记录,并在 Vercel 设好互相跳转。 |
| 解析到 Cloudflare 的 IP(`104.x`/`172.67.x`) | 还是橙云。把那条记录的云朵点成**灰色**。 |
| 这个域名在别的 Vercel 项目里用过,现在加不上 | 一个域名同一时间只能绑一个 Vercel 项目。先去旧项目把它 Remove,再来当前项目 Add。 |

---

## 6 · 完成自检清单

- [ ] 域名在 Cloudflare 显示 **Active**
- [ ] Vercel 项目 → Settings → Domains 里**已添加**这个域名
- [ ] Cloudflare 里有对应的 **CNAME(子域名)/ A(根域名)** 记录,且是**灰云(DNS only)**
- [ ] Vercel 域名状态为 **Valid Configuration**,证书已签发
- [ ] 浏览器打开 `https://你的域名` 能看到网站、带🔒

全部打勾 = 大功告成 🎉

---

## 附录 A · 把域名接入 Cloudflare(第 1 步②还没就绪时看)

如果你的域名还没在 Cloudflare 管理 DNS:

1. 登录 [Cloudflare](https://dash.cloudflare.com) → 右上 **Add a site / 添加站点** → 输入你的**根域名**(`example.com`)→ 选 **Free** 套餐。
2. Cloudflare 会自动扫描你现有的 DNS 记录,并给你**两个 nameserver**,形如 `xxx.ns.cloudflare.com`。把这两个记下来。
3. 去你**买域名的注册商**后台(Namecheap / GoDaddy / 阿里云 / 腾讯云 等)→ 找到该域名的 **Nameservers / DNS 服务器** 设置 → 把原来的两个换成 Cloudflare 给的那两个 → 保存。
4. 回 Cloudflare 等待,直到该域名状态变成 **Active**(几分钟到几小时不等)。**Active 之后**再回到本指引的「第一步」。

> 如果域名本来就是在 **Cloudflare Registrar** 买的,它天生就在 Cloudflare,**跳过附录 A**。

---

## 附录 B · 本仓库的真实实例

- **应用**:`study-english-lixiao`(Vercel team `roc-jia7s-projects`)
- **自定义域名**:`lxll-study.pigent.top`(子域名)
- **Cloudflare 记录**:`CNAME` `lxll-study` → `cname.vercel-dns.com`,**DNS only(灰云)**
- **实测结果**:
  - `dig +short lxll-study.pigent.top` → `cname.vercel-dns.com.` → `76.76.21.93` / `66.33.60.194`
  - `curl -sSI https://lxll-study.pigent.top` → `HTTP/2 200`,`server: Vercel`,HSTS 已开
- `*.vercel.app` 地址仍保留;每次 push 到 `main` 自动部署,自定义域名同步更新。
