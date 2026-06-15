/**
 * Manual enrichment overrides — the HIGHEST-priority layer of the pipeline's
 * enrichment chain (override → DictionaryData → ECDICT). Use it to fix the
 * handful of words where a dictionary's first sense isn't the textbook/teaching
 * sense (e.g. ruler = 尺子, not 统治者), or to give kid-friendly glosses to bare
 * function words. Keyed by the lowercased word. See docs/word-integration-plan.md.
 */
export interface Override {
  translation?: string;
  phonetic?: string;
}

export const OVERRIDES: Record<string, Override> = {
  // Textbook sense ≠ dictionary first sense (人教 3A and friends)
  ruler: { translation: "尺子" },
  eraser: { translation: "橡皮" },
  crayon: { translation: "蜡笔" },
  mum: { translation: "妈妈" },
  orange: { translation: "橙子" },
  no: { translation: "不;没有" },
  bag: { translation: "书包" },
  pen: { translation: "钢笔" },
  "pencil box": { translation: "铅笔盒" },
  cat: { translation: "猫" },

  // Terse/archaic single-char dictionary glosses → kid-friendly words
  nose: { translation: "鼻子" },
  mouth: { translation: "嘴" },
  arm: { translation: "胳膊" },
  foot: { translation: "脚" },
  egg: { translation: "鸡蛋" },
  milk: { translation: "牛奶" },
  juice: { translation: "果汁" },
  rice: { translation: "米饭" },
  elephant: { translation: "大象" },
  eight: { translation: "八" },
  one: { translation: "一" },

  // Bare function words — kid-friendly glosses
  the: { translation: "这个;那个" },
  a: { translation: "一个" },
  an: { translation: "一个" },

  // 人教小学全套:缩写 / 专有名词漏译 / 词义错位
  uk: { translation: "英国" },
  tv: { translation: "电视" },
  ms: { translation: "女士" },
  mrs: { translation: "夫人" },
  mr: { translation: "先生" },
  rsvp: { translation: "请回复" },
  gym: { translation: "体育馆" },
  hamburger: { translation: "汉堡包" },
  draw: { translation: "画" },
  party: { translation: "聚会" },
  feel: { translation: "感觉" },
  lot: { translation: "许多" },
  mine: { translation: "我的" },
  saw: { translation: "看见(see过去式)" },
  well: { translation: "好;嗯" },
};
