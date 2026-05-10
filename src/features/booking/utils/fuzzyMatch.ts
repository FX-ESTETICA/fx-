import { pinyin } from 'pinyin-pro';

/**
 * World-class Fuzzy Match Engine for Service Selection
 * NLP 降维提取：将中文转化为拼音首字母和全拼，实现极致模糊匹配
 */

export interface FuzzyServiceItem {
  id: string;
  name: string;
  pinyinInitial: string; // 拼音首字母 (e.g. gjrf)
  pinyinFull: string;    // 拼音全拼 (e.g. gaojiranfa)
  acronym: string;       // 英文首字母缩写 (e.g. phc)
  originalItem: any;     // 原始数据对象
}

/**
 * 预处理服务列表，生成匹配索引
 */
export const buildFuzzyIndex = (services: any[]): FuzzyServiceItem[] => {
  return services.map(service => {
    const name = service.name || '';
    
    // 1. 提取拼音首字母 (针对中文)
    // pinyin-pro pattern: 'first' returns initial letters
    const pinyinInitial = pinyin(name, { pattern: 'first', type: 'array' }).join('').toLowerCase().replace(/\s+/g, '');
    
    // 2. 提取全拼 (针对中文)
    const pinyinFull = pinyin(name, { toneType: 'none', type: 'array' }).join('').toLowerCase().replace(/\s+/g, '');
    
    // 3. 提取英文词首 (针对英文或混合)
    // 匹配连续的英文字母
    const englishWords = name.match(/[a-zA-Z]+/g) || [];
    const acronym = englishWords.map((w: string) => w.charAt(0)).join('').toLowerCase();
    
    return {
      id: service.id,
      name: name,
      pinyinInitial,
      pinyinFull,
      acronym,
      originalItem: service
    };
  });
};

/**
 * 针对单个输入词（缩写或全拼），在索引库中寻找最佳匹配项
 * @param term 输入的缩写 (e.g., 'mn', 'mj', '美甲')
 * @param index 预处理好的服务索引库
 * @returns 最匹配的服务ID，如果没找到则返回 null
 */
export const findBestMatch = (term: string, index: FuzzyServiceItem[]): string | null => {
  if (!term || term.trim() === '') return null;
  
  const cleanTerm = term.trim().toLowerCase();
  
  // 多策略复合打分
  let bestMatchId: string | null = null;
  let highestScore = 0;
  
  for (const item of index) {
    let score = 0;
    
    // 策略 1: 原名完全包含 (最高优先级)
    if (item.name.toLowerCase().includes(cleanTerm)) {
      score = 100;
    }
    // 策略 2: 拼音首字母完全一致或前缀匹配 (例如输入 'mj' 匹配 'mj' 美甲)
    else if (item.pinyinInitial.startsWith(cleanTerm)) {
      score = 80 + (cleanTerm.length / item.pinyinInitial.length) * 10;
    }
    // 策略 3: 英文缩写前缀匹配
    else if (item.acronym && item.acronym.startsWith(cleanTerm)) {
      score = 75 + (cleanTerm.length / item.acronym.length) * 10;
    }
    // 策略 4: 全拼包含
    else if (item.pinyinFull.includes(cleanTerm)) {
      score = 50;
    }
    
    // 策略 5: 拼音首字母包含 (中间匹配，例如 'jr' 匹配 'gjrf' 高级染发)
    else if (item.pinyinInitial.includes(cleanTerm)) {
      score = 30;
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatchId = item.id;
    }
  }
  
  // 设定一个最低阈值，防止瞎匹配
  if (highestScore >= 30) {
    return bestMatchId;
  }
  
  return null;
};
