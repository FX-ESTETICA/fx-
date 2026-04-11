// 1. 全球边缘计算加速：将后端部署在 Vercel Edge 网络，极速响应跨国请求
export const runtime = 'edge';

// 2. 世界级大模型容灾池 (Zero-Cost Multi-Provider Fallback Pool)
// 包含你配置的代理以及全球最稳定的公益代理节点，按优先级排列
const PROXY_POOL = [
  process.env.OPENAI_BASE_URL,                           // 你的首选节点 (如果配了)
  "https://api.chatanywhere.tech/v1",                    // 节点 2: ChatAnywhere 官方镜像
  "https://api.openai-proxy.org/v1",                     // 节点 3: 国际公益代理 1
  "https://oai.hconeai.com/v1"                           // 节点 4: Helicone 全球加速节点
].filter(Boolean) as string[];

export async function POST(req: Request) {
  try {
    const { messages, shopConfig } = await req.json();

    // --- 全球化绝对物理时区锁定 (Global Timezone Lock) ---
    // 获取门店配置的时区，如果没有则默认使用意大利时间 (Europe/Rome)
    const storeTimezone = shopConfig?.timezone || 'Europe/Rome';
    
    // 获取此时此刻，该门店所在地的【真实物理时间】
    const currentStoreTime = new Intl.DateTimeFormat('zh-CN', {
      timeZone: storeTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
      hour12: false
    }).format(new Date());

    // 动态生成基于当前商店信息的 System Prompt
    // 【架构级优化】：放宽“预约死板限制”，注入门店百科全书能力与赛博朋克顶级管家话术
    const systemPrompt = `
      你是数字空间门店 [${shopConfig?.name || "GX 联盟门店"}] 的专属 AI 预约管家。
      你的核心目标是为阁下（客户）提供极其高级、专业、带有私人管家属性（赛博朋克、未来科技感）的对话体验，并最终引导其完成服务预约。

      【动态行业认知锁定法则 (Industry Persona Injection)】
      - 你的底层行业属性是：[${shopConfig?.industryType || "未知行业"}]。
      - 警告：你【必须】严格基于此行业属性来理解所有的服务名称和专业黑话。例如，如果行业是“美业/美容美甲”，你必须将 \`gel\` 翻译并理解为“光疗/凝胶”，绝对禁止翻译为“胶水”；如果行业是“餐饮”，你才能将其理解为“果冻”。
      - 在回答客户问题时，你的所有语境、常识推演和专业名词选择，必须 100% 贴合该行业的高端服务标准。

      【绝对物理时钟与时区锁定原则】(最高优先级)
      - 当前门店所在地的真实物理时间是：[${currentStoreTime}]。
      - 无论客户在全球哪个时区，他们口中的所有相对时间（如“今天”、“明天”、“两小时后”），你【必须、绝对、唯一】以此门店当地时间作为基准进行推算！
      - 推算出的最终预约时间，必须严格格式化为 \`YYYY-MM-DD HH:mm\` 输出，绝不能带有任何含糊的时区概念。

      【管家行为准则与高情商引导】
      1. 门店百科：你不仅处理预约，还是门店的活字典。当阁下询问门店位置、营业时间、今天谁上班、有什么项目等【门店相关问题】时，你必须用优雅的语言直接回答，绝不能说“我只能处理预约”。
         - 提示：当前门店的已知信息在下方提供。如果未提供某项信息（如谁在上班），请回答类似：“阁下，我们的技师团队今日全员在线/部分在线。为确保您的体验，请告诉我您心仪的专属技师，我将为您扫描其确切档期。”
      2. 顺滑引导：在完美解答阁下的疑问后，必须自然、不留痕迹地抛出引导预约的反问（例如：“本店坐标位于...，请问阁下需要我为您锁定今天的服务舱位吗？”）。
      3. 拒绝绝对闲聊：只有当阁下询问完全与门店、美业、服务无关的纯闲聊（如写代码、做数学题、谈论政治）时，才礼貌拒绝：“阁下，我的算力专为本门店的数字服务而生，请允许我为您介绍我们的特权服务。”

      【当前门店可用信息参考】
      - 门店名称：${shopConfig?.name || "未公开名称"}
      - 门店联系专线：${shopConfig?.phone || "暂未公开电话"}
      - 可用服务项目 (核心知识图谱)：${shopConfig?.services ? JSON.stringify(shopConfig.services) : "暂未配置"}
      （如果客户问及地址或电话，你可以说：“我们的物理坐标正在为您同步，或者您可以直接致电 ${shopConfig?.phone || '店长'}。您今天想体验什么项目？”）

      【顾问式导购漏斗法则（最高优先级）】
      1. 意图承接与【强制完整遍历】：当客户提到某个大类（如 MANI/美甲）时，你必须在【可用服务项目】字典中，找出属于该大类的【所有】项目，并且【绝对禁止遗漏任何一项】，将它们完整地罗列给客户。
      2. 单语纯净翻译法则：你在向客户展示项目时，【绝对禁止】暴露内部的项目缩写（\`code\`），也【绝对禁止】原样照抄字典里包含斜杠和多语言对照的 \`fullName\`（如“Manicure / 只修手”）。你必须根据客户提问的语言（如果是中文就只用中文，如果是意大利语就只用意大利语），将 \`fullName\` 提炼成一句极其纯净、专业的单语名称，加上价格 \`price\` 展示给客户。
         - （例如客户用中文问，你应该回答：“阁下，我们在美甲类目下为您提供：1. 基础修手 - ¥13；2. 甲油胶 - ¥30... 请问您想预约哪一种？”）
      3. 连单探测 (Cross-selling)：当客户选定了一个主项目后，你必须主动进行连单追问。
         - （例如：“好的，甲油胶已为您确认。请问您还需要叠加其他服务吗？比如卸甲或足部护理？”）
      4. 绝对精准匹配：如果客户的要求在字典的 \`fullName\` 中完全找不到对应，绝对禁止自行瞎猜！必须诚实回答：“阁下，本店标准服务库中未检索到该项目。我们提供的是 [列出最接近的纯净单语名称]。如果您需要定制服务，请致电店长专线。”
      
      【预约三要素闭环】
      3. 触发系统动作 (Function Calling 替代)：当且仅当以上三个要素全部确认，且客户明确表示同意/确定预约时，你必须在回复的【最后一行】输出以下系统指令（前端拦截器会捕获它）：
         [ACTION:BOOKING|time:具体时间|service:服务项目|tech:专属技师]
         注意：必须严格按照上述格式输出这行代码，在此指令上方，你可以说一句客套话，例如“正在为您锁定舱位...”。

      【对话风格与限制】
      - 语气：专业、简练、高情商、不卑不亢、带有轻微的赛博朋克或未来科技感（可适度使用“阁下”、“指令”、“扫描”、“档期”、“坐标”等词汇，但不要中二）。
      - 回复长度：绝对简短直接，每次只回答或反问一句话，绝对不要长篇大论。

      请基于以上设定，直接开始回复阁下的消息。
    `;

    // 组装最终发给大模型的消息数组 (把系统设定插在最前面)
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content }))
    ];

    const apiKey = process.env.OPENAI_API_KEY || "";

    // 3. 构建底层纯净流 (Pure Stream)，彻底剥离 Vercel 的加密协议
    const stream = new ReadableStream({
      async start(controller) {
        let success = false;
        let lastError = "";

        // 核心：轮询容灾池。如果一个节点崩了，立刻静默切换到下一个
        for (const proxy of PROXY_POOL) {
          try {
            const endpoint = `${proxy}/chat/completions`;
            
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: "gpt-4o-mini", // 使用你设定好的高智商模型
                messages: apiMessages,
                stream: true,         // 必须开启流式传输
              })
            });

            // 如果节点限流 (429) 或崩溃 (500)，立刻扔出错误，进入下一个节点的循环
            if (!response.ok) {
              lastError = `[${response.status}] ${response.statusText}`;
              console.warn(`[容灾池] 节点 ${proxy} 失效:`, lastError);
              continue; 
            }

            // 节点连通！开始解析数据流
            success = true;
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // SSE 协议解析核心：将二进制块拼成字符串，按行分割
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 最后一个可能被截断的行留到下一次循环

                for (const line of lines) {
                  const trimmed = line.trim();
                  // 只抓取 "data: " 开头的标准内容块
                  if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                    try {
                      const data = JSON.parse(trimmed.slice(6));
                      const content = data.choices[0]?.delta?.content;
                      if (content) {
                        // 【最关键的一步】：直接向前端吐出极其纯净的字符串，绝不加半个括号或额外标签
                        controller.enqueue(new TextEncoder().encode(content));
                      }
                    } catch (e) {
                      // 忽略被截断的异常 JSON 行，继续读取下一个
                    }
                  }
                }
              }
              
              // 【Buffer Flusher】防丢包：如果读取结束后，buffer 还有残留（比如最后一行没有回车符），强制清空它
              if (buffer.trim()) {
                const trimmed = buffer.trim();
                if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                  try {
                    const data = JSON.parse(trimmed.slice(6));
                    const content = data.choices[0]?.delta?.content;
                    if (content) {
                      controller.enqueue(new TextEncoder().encode(content));
                    }
                  } catch (e) {
                     // 忽略
                  }
                }
              }
            }
            break; // 读取完成，跳出轮询池！
          } catch (error: any) {
            console.warn(`[容灾池] 节点 ${proxy} 网络异常:`, error.message);
            lastError = error.message;
            continue; // 继续下一个备用节点
          }
        }

        // 如果容灾池里的所有 4 个节点全部爆炸（极小概率的全球断网）
        if (!success) {
          const fallbackMessage = `（系统提示：管家星际链路受到强磁场干扰，所有全球节点均已熔断。请稍后再试。最后错误：${lastError}）`;
          controller.enqueue(new TextEncoder().encode(fallbackMessage));
        }
        
        controller.close();
      }
    });

    // 伪装成 200，并返回流式纯文本，防止前端崩溃
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (error: any) {
    console.error("Chat API 致命错误:", error);
    return new Response(
      `（系统提示：系统级故障，无法初始化大模型矩阵：${error?.message || "未知异常"}）`,
      { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }
}
