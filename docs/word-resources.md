# 单词资源调研记录(词源候选 / 获取路径 / 许可证)

> 目的:为"自定义/选定词源 → 背诵计划 + 进度管理"功能选底层数据。
> 状态(2026-06):已分类核验;MVP 基石定为 **ECDICT(MIT)** + **DictionaryData(Apache-2.0)**。
> 当前进度:正按方案 (b) 用**手工样例词包**验证卡片效果,验证后再决定如何接入这些数据集。

---

## 分类速览

| 类型 | 作用 | 代表 | 形态/字段 | 许可证 |
| --- | --- | --- | --- | --- |
| A 综合英汉词典 | 补全引擎 + 按 tag 切词包 | **ECDICT** | CSV/SQLite,76万词,带分级 tag | **MIT ✅** |
| A 备选大词库 | 大而全的释义/词性 | 1eez/103976 | SQL/CSV/Excel,10万词,无分级 | 需确认 ⚠️ |
| B 成品分级/考试词表 | 直接做内置词包 | KyleBing / mahavivo / qwerty | json/txt/csv,分级或考试词 | 多数未标注 / GPL ⚠️ |
| C 教材按年级·单元 | 贴课本计划 | **DictionaryData** | CSV(`>`分隔),按 book+Unit | **Apache-2.0 ✅** |
| D 官方课标 | 权威对齐校验 | 教育部课程标准附录 | 多为 PDF,需数字化 | 公有领域 ✅ |

---

## 候选清单(含获取路径)

### A · 综合英汉词典(补全引擎)

**ECDICT —— 首选基石** ⭐
- 仓库:https://github.com/skywind3000/ECDICT
- 终极版(222万词):https://github.com/skywind3000/ECDICT-ultimate
- 关键文件:`ecdict.csv`(全量 76万)、`ecdict.mini.csv`(精简子集)、`stardict.7z`(SQLite);也见 Releases 页下载。
- 获取:`git clone https://github.com/skywind3000/ECDICT`(全量较大,建议只取 mini 或按需抽取)。
- 字段:`word, phonetic, definition, translation, pos, collins, oxford, tag, bnc, frq, exchange, detail, audio`。
- **分级 tag(关键)**:`zk`=中考、`gk`=高考、`cet4`、`cet6`、`ky`=考研、`toefl`、`ielts`、`gre`(空格分隔,可多标签)。→ 直接按 tag 切"中考/高考/四级…"成品包。
- 许可证:**MIT**。致谢页需注明。

**1eez/103976**(备选大词库)
- 仓库:https://github.com/1eez/103976 —— 10.4万词,SQL/CSV/Excel,含中文翻译+词性,无分级 tag。许可证需确认。

### B · 成品分级 / 考试词表(参考为主)

| 资源 | 路径 | 内容 | 许可证 |
| --- | --- | --- | --- |
| KyleBing/english-vocabulary | https://github.com/KyleBing/english-vocabulary | 初中3223/高中6008/CET4/6/考研/托福/SAT,txt+json(json 带词性·释义·短语,部分音标/例句) | **未标注 ⚠️** |
| mahavivo/english-wordlists | https://github.com/mahavivo/english-wordlists | 小学/中考/高中/四六级/托福/GRE/COCA/专四八,txt/xlsx/csv | **未标注 ⚠️** |
| qwerty-learner(词库) | https://github.com/RealKai42/qwerty-learner ·`/public/dicts/*.json` · [格式文档](https://github.com/RealKai42/qwerty-learner/blob/master/docs/toBuildDict.md) | JSON `[{name, trans[], usphone, ukphone}]`,CET/考研/雅思/GRE/SAT/专四八/商务;数据源 kajweb,音标取自有道 API | 应用 **GPL-3.0**,数据需另确认 ⚠️ |

> ⚠️ GitHub 仓库**无 LICENSE 文件 = 默认保留所有权利**,严格说不可直接再分发。B 类仅作参考/查漏,不直接打包进 App。

### C · 教材按年级 / 单元(贴课本计划)

**DictionaryData —— 教材分级基石** ⭐
- 仓库:https://github.com/LinXueyuanStdio/DictionaryData
- 形态:CSV,字段分隔符为 `>`(`word_translation.csv` 用标准逗号)。
- 关键文件:`book.csv`(400+ 词书/教材元数据)、`relation_book_word.csv`(词↔书,带 `Unit 1` 等 tag)、`word_translation.csv`(中文释义);词条字段含 `vc_vocabulary, vc_phonetic_uk, vc_phonetic_us, vc_frequency, vc_difficulty`。
- 覆盖:小学/初中/高中/考研/出国(GRE、托福…),按教材+单元组织。
- 许可证:**Apache-2.0**。致谢页需注明。

### D · 官方课标(权威对齐,公有领域)

- 教育部《义务教育英语课程标准》《普通高中英语课程标准》附录词汇表。
- 规模:小学 ~500、初中 1600–2000、高考 3500–3500。
- 获取:国家中小学智慧教育平台 / 教育部官网 / 学术站搜"课程标准 附录 词汇表"(多为 PDF/DOC,需自行数字化)。
- 第三方整理样例:3500 高考词查询 https://celeslime.github.io/3500/
- 用途:作"权威对齐"校验集(交叉过滤 ECDICT,保覆盖、不超纲);释义/音标仍用 ECDICT 补。

---

## 映射到本项目 `VocabularyWord`

```
word        ← word / name / vc_vocabulary
phonetic    ← phonetic / usphone / vc_phonetic_us     (ECDICT 不带斜杠,补 /…/)
translation ← translation / trans[] / word_translation (ECDICT 中文多行,取首条或精简)
category/tier ← ECDICT tag(zk/gk/cet…)或教材 grade+Unit 映射
audioUrl    ← 留空 → 任意英文词用 Web Speech 朗读(零成本、离线)
emoji/句子   ← 自定义词通常没有 → 卡片已支持"无 emoji 字母贴 + 无句子"形态
id          ← `pack-<packId>-<word>` → 现有 applyAnswer/遗忘曲线自动跟踪进度
```

---

## 推荐组合(最有效)

1. **ECDICT(MIT)** 当补全引擎 + 按 tag 切内置词包(中考/高考/四级…)——一个干净许可的库既当引擎又当词包。
2. **DictionaryData(Apache-2.0)** 做"人教版某年级 Unit X"的贴课本计划。
3. **官方课标** 作可选权威对齐校验集(后期)。
4. KyleBing / mahavivo / qwerty / 1eez 仅作参考查漏,不直接分发。
5. **致谢页**注明 ECDICT(MIT)、DictionaryData(Apache-2.0)及课标来源。

## ⚠️ 体积/形态注意

ECDICT 全量 76 万词(数十~上百 MB),**不整包进前端**。做法:离线预处理脚本只抽取需要子集(各分级 tag 词 + 命中导入词)产出**精简 JSON 词包**(每包几百~几千词)打包;补全用本地小词典或轻量查询接口。

## 下一步

- [x] 资源调研 + 分类 + 许可核验(本文件)
- [x] **(b) 样例词包验证**:手工 1–2 个示例包(新课标小学核心 / 人教三上 Unit1)→ 接现有卡片与会话,看数据质量与效果。
- [x] 计划引擎:配额驱动(每天 N 新词 + 到期复习)+ ETA + 进度环;家长看板拆成李校/课本双轨。
- [x] **集成方案成文** → 见 [`word-integration-plan.md`](./word-integration-plan.md)(角色分工 / 选择×补全×排序组合机制 / 离线流水线 / 加载策略 / 分期)。
- [x] **Phase 1**:离线流水线落地(`scripts/build-packs.ts` + `data/packs.config.ts` + `data/overrides.ts`),教材+分级两条链路各跑通 1 个真实包(人教三上 64 词 / 中考核心 600 词)→ `lib/wordpacks/generated/`。
- [ ] **Phase 2**:扩 K12 分级集 + 多套教材;懒加载 + 词包选择器;接课标白名单交集。
