import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(prefix: 'RP' | 'GT' | 'MC' | 'AD') {
  let digits = ''
  let isUnlucky = true
  
  if (prefix === 'AD') {
    // 管理员 ID 可以更特别，比如 00000001
    return `AD00000001`
  }

  while (isUnlucky) {
    digits = Math.floor(10000000 + Math.random() * 90000000).toString()
    // 意大利忌讳 17 (XVII -> VIXI "I have lived")
    // 检查是否包含 17 
    if (!digits.includes('17')) {
      isUnlucky = false
    }
  }
  
  return `${prefix}${digits}`
}

/**
 * 简单的多语言不文明用语过滤
 */
const BANNED_WORDS = [
  // 英语
  'fuck', 'shit', 'asshole', 'bitch', 'damn',
  // 意大利语
  'cazzo', 'merda', 'vaffanculo', 'stronzo', 'puttana',
  // 中文
  '傻逼', '操你', '垃圾', '畜生', '混蛋'
]

const BOSS_NAME = 'GX⁺'
const BOSS_EMAILS = ['499755740@qq.com']

export function validateUserName(name: string, userEmail?: string): { isValid: boolean; error?: string } {
  // 1. 检查前后空格
  const trimmedName = name.trim()
  
  if (name.length !== trimmedName.length) {
    return { isValid: false, error: '名字前后不能包含空格' }
  }

  if (trimmedName.length === 0) {
    return { isValid: false, error: '名字不能为空' }
  }

  const isBoss = userEmail && BOSS_EMAILS.includes(userEmail)

  // 2. BOSS 名字及符号锁定
  if (trimmedName === BOSS_NAME) {
    if (!isBoss) {
      return { isValid: false, error: '此名字为 BOSS 专属，您无权使用' }
    }
  }

  // 3. 符号限制（除 BOSS 外不允许使用符号，只允许字母和中间空格）
  if (!isBoss) {
    // 正则表达式：只允许中文字符、英文字母和中间的空格
    // \u4e00-\u9fa5 是中文范围
    // a-zA-Z 是英文范围
    // \s 是空格
    const validNameRegex = /^[\u4e00-\u9fa5a-zA-Z]+(\s[\u4e00-\u9fa5a-zA-Z]+)*$/
    if (!validNameRegex.test(trimmedName)) {
      return { isValid: false, error: '名字只能包含文字或字母，中间可加空格，禁止使用符号' }
    }
  }

  // 4. 不文明用语过滤
  const lowerName = trimmedName.toLowerCase()
  const containsBanned = BANNED_WORDS.some(word => lowerName.includes(word))
  
  if (containsBanned) {
    return { isValid: false, error: '名字包含不文明用语，请重新输入' }
  }

  return { isValid: true }
}
