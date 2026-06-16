# 词源集成方案(选择 · 组合 · 接入)

> 承接 [`word-resources.md`](./word-resources.md) 的资源调研结论,规划**怎么把这些词源集成成 App 里的词包**:角色分工、组合机制、离线流水线、加载策略、分期落地。
> 现状(2026-06):样例词包(plan b)已接通卡片/会话/遗忘曲线/家长看板(李校 vs 课本双轨)。下一步把**手工样例**换成**从数据集生成的真实词包**。

---

## 1. 角色分工(每个词源干一件事)

| 词源 | 许可证 | 在本方案里的唯一职责 |
| --- | --- | --- |
| **ECDICT** | MIT ✅ | ① 补全引擎(任意词 → 音标/释义/词性/词频);② 按 `tag` 切**考试分级包**(中考/高考/四级/六级/考研/托福/雅思/GRE) |
| **DictionaryData** | Apache-2.0 ✅ | 按 `book + Unit` 切**贴教材词包**(人教/外研… 各年级各单元,保留单元顺序) |
| **官方课标** | 公有领域 ✅ | **白名单校验集**(交叉过滤,保覆盖、不超纲),本身不直接成包(无音标) |
| KyleBing / mahavivo / qwerty / 1eez | 未标注 ⚠️ | **只查漏参考,不打包分发** |

---

## 2. 组合机制 —— 把"选词"和"填词"拆开(核心)

一个词包 = **选择层(选哪些词) × 补全层(每个词的数据) × 排序层(先学哪个)**。三层正交,可自由组合。

### 2.1 选择层(membership)
决定一个包里有哪些词,三种选择器:

- `ecdict-tag` —— 按 ECDICT 分级 tag 选(`zk/gk/cet4/cet6/ky/toefl/ielts/gre`),可与课标白名单求交集。
- `dictdata-book` —— 按 DictionaryData 的某本词书选,保留 `Unit` 分组与顺序。
- `import` —— (后期)用户上传的 CSV/TXT 词表。

### 2.2 补全层(enrichment)—— 优先级链
每个被选中的词,按优先级补全字段,先命中者胜:

```
phonetic    : DictionaryData(教材音标) → ECDICT phonetic_us → 留空(Web Speech 仍可朗读)
translation : DictionaryData(贴教材释义) → ECDICT translation 首条/精简 → 缺失则丢弃并记入报告
pos/freq    : ECDICT pos / frq(仅用于排序与可选展示,不一定进产物)
```

> 关键原则:**教材包优先用 DictionaryData 的释义**(贴课本语境),考试/课标包用 ECDICT。缺中文释义的词一律丢弃 + 写进覆盖率报告,绝不出残缺卡。

### 2.3 排序层(order)
- 教材包:`unit` —— 保留课本单元顺序(符合课堂进度)。
- 考试/课标包:`frequency` —— 按 ECDICT `frq/bnc` 高频在前(遗忘曲线先吃高频词更划算)。

### 2.4 组合矩阵(选择 × 补全示例)

| 目标包 | 选择层 | 补全主源 | 排序 |
| --- | --- | --- | --- |
| 人教三上 Unit1 | dictdata-book | DictionaryData→ECDICT | unit |
| 小学核心 | ecdict-tag `zk` ∩ 课标小学 | ECDICT | frequency |
| 中考 1600 | ecdict-tag `zk` ∩ 课标中考 | ECDICT | frequency |
| 高考 3500 | ecdict-tag `gk` ∩ 课标高考 | ECDICT | frequency |
| 四级核心 | ecdict-tag `cet4` | ECDICT | frequency |

---

## 3. 接入方式 —— 离线流水线(绝不整包进前端)

ECDICT 全量 76 万词,**只在离线/CI 跑预处理,产出精简 JSON**,App 只装抽取后的小词包。

```
scripts/build-packs.ts            ← Node 脚本,本地/CI 运行,不进 App 包
  读入(.gitignore,按需下载):
    data/raw/ecdict.csv
    data/raw/DictionaryData/{book.csv, relation_book_word.csv, word_translation.csv}
    data/raw/syllabus/{primary.txt, zhongkao.txt, gaokao3500.txt}   ← 课标白名单(数字化后)
  配置:
    data/packs.config.ts          ← 声明式词包清单(下方)
  产出:
    lib/wordpacks/generated/*.json   ← 每包几百~几千词的精简 JSON
    lib/wordpacks/index.ts           ← 注册表(generated + 手工样例)
    NOTICE                            ← 许可证致谢
    build-report.md                  ← 每包词数 / 丢弃词 / 覆盖率
```

### 3.1 声明式词包清单(加包不改流水线代码)

```ts
// data/packs.config.ts
export const PACKS: PackSpec[] = [
  { id: "pep-3a-u1", name: "人教版三年级上 · Unit 1", source: "DictionaryData(Apache-2.0)",
    select: { kind: "dictdata-book", bookId: "<人教3A>", units: ["Unit 1"] }, order: "unit" },

  { id: "primary-core", name: "新课标小学核心", source: "ECDICT(MIT) ∩ 课标",
    select: { kind: "ecdict-tag", tag: "zk", intersect: "primary" }, order: "frequency", cap: 600 },

  { id: "zhongkao", name: "中考核心词", source: "ECDICT(MIT) ∩ 课标",
    select: { kind: "ecdict-tag", tag: "zk", intersect: "zhongkao" }, order: "frequency", cap: 1600 },
];
```

### 3.2 产物 schema(只留 App 需要的字段)

```jsonc
{ "id": "pep-3a-u1", "name": "...", "subtitle": "...", "source": "...",
  "words": [ { "word": "pencil", "phonetic": "/ˈpensl/", "translation": "铅笔", "unit": "Unit 1" } ] }
```

流水线把它包成现有的 `WordPack`(`id` → `pack-<packId>-<word>`),**下游零改动**:`study-plan.ts` / 遗忘曲线 / 家长看板双轨 已经全吃 `WordPack`。

---

## 4. 加载策略(体积可控)

- 单包很小(几百~几千词 × ~40B ≈ 几十~几百 KB);当前首屏 192KB JS。
- **起步集内联**(小学核心 + 当前教材包),**其余按需懒加载**(GRE/托福等 `dynamic import` 或从 `/public` 拉),避免首屏膨胀。
- 词包选择 UI 按**教材 / 考试**两组归类(贴合家长看板已有的双轨语义)。

---

## 5. 分期落地

- **Phase 0(已完成)**:资源调研 + 手工样例 + 计划引擎 + 家长看板双轨。
- **Phase 1(已完成)**:离线流水线落地,**两条链路各跑通 1 个真实包**:
  - `scripts/build-packs.ts` + 声明式 `data/packs.config.ts` + 覆盖层 `data/overrides.ts` + `scripts/fetch-word-data.sh`。
  - 产出 `lib/wordpacks/generated/`:**人教三上全册 64 词**(DictionaryData)、**中考核心 600 词**(ECDICT tag=zk 按词频)。
  - 验证收获:词典首义≠课本义(ruler→统治者、mum→菊花)+ 行内词性污染(黄色adj.黄色的),已在清洗 + 覆盖层修复;原始数据集 gitignore,仅提交精简 JSON(6.7KB / 50KB)。
- **Phase 2(进行中)**:
  - [x] **懒加载**:`lib/wordpacks/manifest.json` 常驻(仅元信息),每个词包 `import('./generated/<id>.json')` 各成独立 chunk,打开词包才加载(中考 600 词 ≈ 37KB 独立 chunk)。
  - [x] **词包选择器 UI**:`WordPackPanel` 按 `category` 分「教材同步 / 考试分级」两组;进度用 `packStatsFromProgress`(按 `pack-<id>-` 前缀算,**无需加载词表**)。
  - [x] 小学:人教三起 三上→六下(8 包);初中:沪教牛津 七上→九下(6 包);考试:中考核心 600 词。
  - [x] **补全链补齐 ECDICT 兜底**(override → DictionaryData → ECDICT):自动找回 ~364 个 DictionaryData 缺译的常见词;被丢词全部写入 `data/build-report.md`(剩余多为词组)。
  - [ ] 扩高中/高考 + 更多教材(外研/译林…)。
  - [ ] 接课标白名单做交集过滤。
- **Phase 3(可选)**:CSV/TXT 用户自定义导入(复用补全层 + 内置 ECDICT-mini 客户端补全)。
- **Phase 4(可选)**:课标覆盖率报告进家长看板("覆盖课标 92%")。

---

## 6. 已定决策

1. **Phase 1 范围**:教材 + 分级**两条都跑**(各 1 个真实包)✅
2. **离线流水线现在就搭** ✅(`npm run fetch-word-data` → `npm run build:packs`)
3. **加载**:起步集**内联**(当前 2 包共 ~57KB);更大的分级/出国包留到 Phase 2 懒加载。

---

## 7. 许可与致谢

- `NOTICE` + App 致谢区:ECDICT(MIT)、DictionaryData(Apache-2.0)、课标(公有领域,注明来源)。
- B 类(未标注许可)**仅参考查漏,不进产物、不分发**。
- `data/raw/` 全部 `.gitignore`,流水线文档写明各数据集下载地址。
