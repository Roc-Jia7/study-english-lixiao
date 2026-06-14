import type { VocabularyWord, WordCategory } from "./types";

/**
 * Bundled word packs — the "选定特定单词资源" path. These hand-made samples
 * exist to validate data quality + card experience before we generate real
 * packs from ECDICT (MIT) / DictionaryData (Apache-2.0). See
 * docs/word-resources.md.
 */

export interface WordPack {
  id: string;
  /** Chinese display name. */
  name: string;
  /** English / source line shown under the name. */
  subtitle: string;
  /** Attribution note (for the credits page). */
  source: string;
  words: VocabularyWord[];
}

/** Compact builder: backend-style word (no emoji/sentence, Web Speech audio). */
function w(
  packId: string,
  word: string,
  phonetic: string,
  translation: string,
  category: WordCategory = "nature",
): VocabularyWord {
  return {
    id: `pack-${packId}-${word.toLowerCase().replace(/\s+/g, "-")}`,
    word,
    phonetic,
    translation,
    sentence_en: "",
    sentence_zh: "",
    category,
    tier: "beginner",
    imageUrl: "",
    emoji: "",
    nextReviewTime: "",
  };
}

const PRIMARY = "xkb-primary";
const RJ3A = "rj-3a-u1";

export const WORD_PACKS: WordPack[] = [
  {
    id: PRIMARY,
    name: "新课标小学核心 · 示例",
    subtitle: "Primary core words (sample · 24)",
    source: "示例数据,人工整理(待替换为 ECDICT 抽取)",
    words: [
      w(PRIMARY, "apple", "/ˈæpl/", "苹果", "food"),
      w(PRIMARY, "banana", "/bəˈnɑːnə/", "香蕉", "food"),
      w(PRIMARY, "orange", "/ˈɒrɪndʒ/", "橙子", "food"),
      w(PRIMARY, "egg", "/eɡ/", "鸡蛋", "food"),
      w(PRIMARY, "milk", "/mɪlk/", "牛奶", "food"),
      w(PRIMARY, "rice", "/raɪs/", "米饭", "food"),
      w(PRIMARY, "cat", "/kæt/", "猫", "animals"),
      w(PRIMARY, "dog", "/dɒɡ/", "狗", "animals"),
      w(PRIMARY, "bird", "/bɜːd/", "鸟", "animals"),
      w(PRIMARY, "fish", "/fɪʃ/", "鱼", "animals"),
      w(PRIMARY, "red", "/red/", "红色", "colors"),
      w(PRIMARY, "blue", "/bluː/", "蓝色", "colors"),
      w(PRIMARY, "green", "/ɡriːn/", "绿色", "colors"),
      w(PRIMARY, "yellow", "/ˈjeləʊ/", "黄色", "colors"),
      w(PRIMARY, "school", "/skuːl/", "学校"),
      w(PRIMARY, "teacher", "/ˈtiːtʃə/", "老师"),
      w(PRIMARY, "student", "/ˈstjuːdnt/", "学生"),
      w(PRIMARY, "book", "/bʊk/", "书"),
      w(PRIMARY, "pen", "/pen/", "钢笔"),
      w(PRIMARY, "water", "/ˈwɔːtə/", "水"),
      w(PRIMARY, "happy", "/ˈhæpi/", "快乐的"),
      w(PRIMARY, "friend", "/frend/", "朋友"),
      w(PRIMARY, "mother", "/ˈmʌðə/", "妈妈"),
      w(PRIMARY, "father", "/ˈfɑːðə/", "爸爸"),
    ],
  },
  {
    id: RJ3A,
    name: "人教版三年级上 · Unit 1 · 示例",
    subtitle: "PEP Grade 3A · Unit 1 (sample · 16)",
    source: "示例数据,人工整理(待替换为 DictionaryData 抽取)",
    words: [
      w(RJ3A, "pen", "/pen/", "钢笔"),
      w(RJ3A, "pencil", "/ˈpensl/", "铅笔"),
      w(RJ3A, "pencil-case", "/ˈpensl keɪs/", "铅笔盒"),
      w(RJ3A, "ruler", "/ˈruːlə/", "尺子"),
      w(RJ3A, "eraser", "/ɪˈreɪzə/", "橡皮"),
      w(RJ3A, "crayon", "/ˈkreɪən/", "蜡笔"),
      w(RJ3A, "book", "/bʊk/", "书"),
      w(RJ3A, "bag", "/bæɡ/", "书包"),
      w(RJ3A, "school", "/skuːl/", "学校"),
      w(RJ3A, "hello", "/həˈləʊ/", "你好"),
      w(RJ3A, "hi", "/haɪ/", "嗨"),
      w(RJ3A, "goodbye", "/ˌɡʊdˈbaɪ/", "再见"),
      w(RJ3A, "bye", "/baɪ/", "拜拜"),
      w(RJ3A, "name", "/neɪm/", "名字"),
      w(RJ3A, "teacher", "/ˈtiːtʃə/", "老师"),
      w(RJ3A, "nice", "/naɪs/", "美好的"),
    ],
  },
];
