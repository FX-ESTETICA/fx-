<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# GX 核心架构与设计法则 (MEMO)

## 0. AI 协作绝对宪法 (AI Collaboration Absolute Constitution)

### 0.1 仅讨论不修改指令 (Read-Only Mode)
- **最高优先级法则**：若用户在对话中明确表示“仅讨论不修改”或类似意图，AI **绝对禁止**擅自使用任何文件修改工具（如 Write, SearchReplace, DeleteFile 等）更改项目代码、配置文件或文档。
- **行为规范**：在此模式下，AI 的职责仅限于代码分析、思路探讨、架构设计以及提供代码建议片段。除非用户在后续明确下达“执行修改”、“开始修改”等授权指令，否则不可越界。

## 1. 交互与手势架构 (Gesture & Interaction)

### 1.1 移动端日历矩阵“三态手势模型” (Trinity Gesture Model)
为了解决移动端复杂的触控冲突，矩阵区域 (`EliteResourceMatrix`) 强制采用以下三态解耦机制：
1. **短按极速建单 (Tap to Create)**：
   - 触发条件：按下且在 300ms 内抬起，且位移 < 10px。
   - 系统响应：不唤醒准星，直接根据落点计算资源与时间(按15分钟吸附)，极速触发预约创建。
2. **长按战术准星 (Long Press to Arm)**：
   - 触发条件：按住不动超过 300ms。
   - 系统响应：触发触觉震动反馈(vibrate)，唤醒战术准星。
   - **防劫持防御**：唤醒瞬间，矩阵容器动态注入 `touch-action: none` (通过 `className={cn(..., crosshair.active ? "touch-none" : "")}`)，彻底剥夺浏览器的滚动控制权。此时手指滑动只会拖动准星微调时间，绝不触发页面滚动，抬起手指(`pointerup`)时执行精准创建。
   - **意外中断处理**：分离 `onPointerCancel`。若被系统强行打断(如来电)，仅静默销毁准星，**禁止**触发创建逻辑。
3. **滑动原生滚动 (Scroll / Swipe)**：
   - 触发条件：按下后 300ms 内，手指滑动位移 > 10px。
   - 系统响应：自动取消长按定时器，将控制权 100% 交还给浏览器，实现原生上下滚动与左右翻页。
- **全局防御**：长按区域必须配置 `WebkitUserSelect: 'none', WebkitTouchCallout: 'none'` 并拦截 `ContextMenu`。

## 2. 视觉与排版法则 (Visual & Layout)

### 2.1 预约块(Booking Block)极简降维与自适应排版
在寸土寸金的移动端矩阵中，预约卡片必须遵循“最高信噪比”原则：
1. **极简脱水信息**：
   - 彻底剔除：时间文字、时长、图标(时钟/人头)、冗余状态文字("已确认/Walk-in")。
   - 仅保留：**第一行[服务项目简称]** + **第二行[客户脱水编号]** + **右上角[归属员工圆点]**。
   - **字段强制约束**：传入卡片的标识必须是底层的 `customerId`(如 `GV 0015`)，而非 `customerName`。
2. **动态自适应编号法则 (ID 脱水算法)**：
   - **散客(CO) / 爽约(NO)**：剥离前缀，根据数字大小动态补零（1-999补至3位，如 `CO 008`；1000以上如实显示 `CO 1005`），拒绝长串零占位。
   - **正式会员(GV/AD/AN/UM)**：由于首位数字已携带分类信息(0=GV, 3=AD等)，UI 层**彻底剥离字母前缀**，仅显示纯数字（如 `0015`, `3001`）。
3. **死循环熔断与前置高度判定 (Anti-Layout Thrashing)**：
   - **绝对禁令**：禁止在卡片组件内部使用 `ResizeObserver` 或 `offsetHeight` 结合 `setState` 去探测自身物理高度并动态修改 DOM 结构。这会与父级相对高度(`100%`)产生致命的无限闪烁死循环。
   - **终极解法 (数学前置)**：在父组件(`EliteResourceMatrix`)计算预约块时，直接基于业务数据 `duration`(时长) 进行纯数学判定：`const isTiny = booking.duration <= 45`。
   - 将 `isTiny` 作为静态布尔值注入子组件。卡片收到 `isTiny=true` 时，强制采用**单行水平居中排版 (`MN - CO 008`)**；否则采用**双行排版**。实现零副作用的物理防碰撞。

## 4. 全局路由与沙盒权限架构 (Global Routing & Sandbox Auth)

### 4.1 全局唯一入口法则 (The Only Gate)
- **根路由强制重定向**：访问根域名 `/` 必须被无条件重定向至 `/login` 身份验证网关。禁止任何人绕过登录直接访问驾驶舱或业务系统。
- **空间驾驶舱迁移**：原首页的 WebGL/3D 轮播组件（GX SPATIAL）被迁移并收容至 `/spatial` 隐秘路由，仅供最高权限管理员调用。

### 4.2 三维角色降级矩阵 (3D RBAC Matrix)
系统内置 3 级角色（Role），在 Dashboard 中实施严格的**降级渲染**与越权熔断：
1. **Boss (系统造物主/Admin)**：
   - 拥有最高统摄权。Dashboard 右上角渲染完整 `[USER | MERCHANT | BOSS]` 切换器。
   - 独占 `/spatial` 全景驾驶舱入口卡片。
2. **Merchant (商户/老板)**：
   - 拥有门店管辖权。Dashboard 右上角仅渲染 `[USER | MERCHANT]` 切换器，向下兼容体验员工视角，绝不向上越权。
   - 首次登录触发 **Onboarding 强制拦截**：必须在弹窗中选择经营行业（如 beauty/expert），选定后写入云端 `shop_configs` 锁定，解锁界面。
   - 拥有向下“员工绑定 (Staff Binding)”能力，通过输入员工的 `GX_USR_ID` 将其纳入麾下。
3. **User (普通员工)**：
   - 处于权限底层。Dashboard 右上角**不渲染**任何切换器，死锁在 `USER` 视图。
   - 处于“游离态”时，无专属日历入口；一旦被老板绑定，被动继承老板的 `industry` 与 `shopId`，动态亮起对应的日历通道。

### 4.3 Vercel KV 无数据库沙盒防爆法则 (Cloud JSON Sandbox)
为了在无真实 DB (如 Supabase) 下实现跨设备实时联调，启用 Vercel Serverless Redis 作为全局状态机：
- **数据结构三足鼎立**：
  - `bindings`: 员工与门店的动态从属映射表。
  - `shop_configs`: 门店与行业的经营属性配置表。
  - `bookings`: 动态交易流水表。
- **LRU 数据防爆策略 (Max Length Limit)**：
  - 为防止恶意测试撑爆免费版 30M 缓存，`bookings` 数组执行严格的 **2000条容量封顶** 机制。
  - 触发写入时，若数组长度超载，强制执行 `slice` 截断，剔除最旧的历史记录（保留最新 2000 条），实现永动循环测试系统。
