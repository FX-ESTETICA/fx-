'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import AISmartBall from './AISmartBall'
import { MERCHANTS } from '@/data/merchants'

export default function GlobalAI() {
  const pathname = usePathname()
  
  // 模拟集成 Gemini API 的真实请求函数
  const handleAISendMessage = async (userPrompt: string): Promise<string> => {
    // 这里构造给 AI 的本地知识库上下文
    const context = `
      你是 Rapallo 城市的智能导游。以下是当前 App 内的实时商家数据：
      ${MERCHANTS.map(m => `- ${m.name} (${m.category}): 评分${m.rating}`).join('\n')}
      
      请根据这些信息回答用户。如果用户问哪家好，请推荐评分高的。回复要简短科幻，带点意大利风情。
    `

    // 模拟网络请求延迟
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 模拟 AI 根据本地数据生成的回复
    if (userPrompt.includes("美甲")) {
      return "为您检索到 Rapallo 评分最高的【Estetica Bloom】，它目前处于营业状态，评分 4.9。需要我为您在地图上定位吗？"
    } else if (userPrompt.includes("吃") || userPrompt.includes("餐")) {
      return "本地最受欢迎的是【Pizzeria Rapallo】，评分 4.8。地道的意式风味，系统建议立即前往。"
    } else {
      return "系统已接收指令。Rapallo 港口周边有丰富的休闲选择，建议查看‘发现’或直接询问具体分类。"
    }
  }

  // 隐藏 AI 智能球的页面（后台管理、登录页等）
  const hidePaths = ['/admin', '/auth', '/merchant/onboarding']
  const shouldHide = hidePaths.some(path => pathname?.startsWith(path))

  if (shouldHide) return null

  return (
    <AISmartBall 
      withChat={true} 
      onSendMessage={handleAISendMessage}
      initialMessages={[
        { role: 'ai', content: "Ciao! 我是您的 Rapallo 智能助手。我已经同步了本地所有商户信息，想找好吃的、好玩的，直接问我就好！" }
      ]}
    />
  )
}
