import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// WhatsApp Meta Webhook Verification Token (您在 Meta 后台设置的自定义字符串)
const VERIFY_TOKEN = Deno.env.get('WA_VERIFY_TOKEN') || "GX_NEXUS_VERIFY_2026"

// 初始化 Supabase 客户端 (需要 service_role 权限来绕过 RLS 强制更新 profiles)
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ""
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  const url = new URL(req.url)
  const method = req.method

  // =========================================================================
  // 1. Meta Webhook 握手验证 (GET 请求)
  // 当您在 Meta 后台配置 Webhook URL 时，Meta 会发 GET 请求来验证
  // =========================================================================
  if (method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED')
      return new Response(challenge, { status: 200 })
    } else {
      return new Response('Forbidden', { status: 403 })
    }
  }

  // =========================================================================
  // 2. 接收用户发送的 WhatsApp 消息 (POST 请求)
  // =========================================================================
  if (method === 'POST') {
    try {
      const body = await req.json()

      // 解析 Meta 复杂的数据结构 (WhatsApp 业务 API 标准格式)
      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0]
        const changes = entry?.changes?.[0]
        const value = changes?.value
        
        // 确保这是一条接收到的文本消息
        if (value?.messages && value.messages.length > 0) {
          const message = value.messages[0]
          
          if (message.type === 'text') {
            const senderPhone = `+${message.from}` // WhatsApp 传过来的通常是不带+号的国际区号格式，如 60123456789
            const messageText = message.text.body

            console.log(`[WA_RADAR] 截获终端信号 -> 来源: ${senderPhone}`)
            
            // 校验消息是否符合我们预设的 [GX-VERIFY] 格式
            if (messageText.includes('[GX-VERIFY]')) {
              
              // 正则表达式提取 UID (我们在前端埋入的隐式锚点)
              // 格式示例: "UID: 03fsuxtxxlb7zeggbjyf6sax9"
              const uidMatch = messageText.match(/UID:\s*([a-zA-Z0-9-]+)/)
              const extractedUid = uidMatch ? uidMatch[1] : null

              if (extractedUid) {
                console.log(`[WA_RADAR] 信号解析成功 -> 锚定 UID: ${extractedUid}`)
                
                // 执行跨维操作：更新 Supabase 数据库的 profiles 表
                const { error } = await supabase
                  .from('profiles')
                  .update({ phone: senderPhone })
                  .eq('id', extractedUid)

                if (error) {
                  console.error(`[WA_RADAR] 数据库注入失败: ${error.message}`)
                  // 可以在这里调用 WA API 给用户回复失败信息
                } else {
                  console.log(`[WA_RADAR] 链路注入成功 -> UID: ${extractedUid} 绑定终端 ${senderPhone}`)
                  // 【可选高阶操作】: 调用 Meta 发送消息接口，主动回复用户 "✅ 验证成功，请切回 GX 系统"
                  // await sendWhatsAppMessage(message.from, "✅ [GX 终端验证成功] 您的身份链路已激活。请切回 GX 系统继续操作。")
                }
              } else {
                console.warn('[WA_RADAR] 信号格式异常: 未找到 UID')
              }
            }
          }
        }
      }
      
      // 必须在 200 毫秒内回复 200 OK，否则 Meta 会重试
      return new Response('EVENT_RECEIVED', { status: 200 })
      
    } catch (err) {
      console.error('Webhook Error:', err)
      return new Response('Internal Server Error', { status: 500 })
    }
  }

  return new Response('Method Not Allowed', { status: 405 })
})

// 辅助函数: 用于主动发消息给用户 (需配置 Meta Access Token)
// async function sendWhatsAppMessage(to: string, text: string) { ... }