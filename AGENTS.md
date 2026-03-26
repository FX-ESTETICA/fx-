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
   - **散客(CO) /爽约(NO)**：剥离前缀，根据数字大小动态补零（1-999补至3位，如 `CO 008`；1000以上如实显示 `CO 1005`），拒绝长串零占位。
   - **正式会员(GV/AD/AN/UM)**：由于首位数字已携带分类信息(0=GV, 3=AD等)，UI 层**彻底剥离字母前缀**，仅显示纯数字（如 `0015`, `3001`）。
3. **死循环熔断与前置高度判定 (Anti-Layout Thrashing)**：
   - **绝对禁令**：禁止在卡片组件内部使用 `ResizeObserver` 或 `offsetHeight` 结合 `setState` 去探测自身物理高度并动态修改 DOM 结构。这会与父级相对高度(`100%`)产生致命的无限闪烁死循环。
   - **终极解法 (数学前置)**：在父组件(`EliteResourceMatrix`)计算预约块时，直接基于业务数据 `duration`(时长) 进行纯数学判定：`const isTiny = booking.duration <= 45`。
   - 将 `isTiny` 作为静态布尔值注入子组件。卡片收到 `isTiny=true` 时，强制采用**单行水平居中排版 (`MN - CO 008`)**；否则采用**双行排版**。实现零副作用的物理防碰撞。

### 2.2 全息捕获舱范式 (Camera-First Pod Paradigm)
废弃传统的“表单式上传弹窗”，UGC 内容发布必须遵循顶尖社交平台的沉浸式逻辑：
1. **全屏接管与镜头预热**：点击发布（如 `+` 号），通过深层毛玻璃 (`backdrop-blur-3xl`) 阻断背景，从底部全屏展开捕获舱。
2. **默认设备相机直出**：直接调用 `navigator.mediaDevices.getUserMedia` 获取摄像头画面，铺满全屏。绝不能让用户面对黑盒。
3. **三位一体控制台 (The HUD)**：
   - 中轴：巨大的快门按钮与“拍照/录像”双态拨轮。
   - 右下角：原生相册传送门，点击唤起系统级图库。
4. **悬浮式内容编辑 (Review State)**：选中媒体后，内容成为全屏背景，输入框化为无边框的深色悬浮遮罩层，实现“看着作品写标题”的情绪价值。

### 2.3 无界全息头部法则 (Borderless Hologram Header)
在设计 Dashboard 或身份页的顶部（ProfileHeader）时，彻底摒弃带有边界的深色矩形底板，追求“零包裹感”的赛博空间：
1. **巨型身份水印 (Giant Watermark)**：在背景极深处，使用横跨屏幕的巨大文字（如角色名），配合极低透明度（如 `text-white/[0.02]`），构建空间纵深感。
2. **动态全息雷达环**：在核心标识（如头像）后方，添加极细的、缓慢反向旋转的虚实圆环阵列，作为能量源。
3. **星云脉冲背景**：移除容器的 `overflow-hidden` 与背景色，利用底层散发的青紫渐变光晕 (`blur-[80px]`) 照亮暗场。
4. **材质降维**：去边框化，使用 `bg-black/50 backdrop-blur-md` 等微遮罩提升文字对比度，确保组件自然融于星空。

## 4. 全局路由与沙盒权限架构 (Global Routing & Sandbox Auth)

### 4.1 全局唯一入口法则 (The Only Gate)
- **首页优先 (Homepage-First)**：访问根域名 `/` 无条件重定向至门户首页 `/home`。任何用户第一眼均看到首页；登录在需要权限时再触发。
- **受保护通道延迟鉴权**：访问受保护页面或执行受保护操作（如 `/dashboard`、日历写入、商户配置、`/spatial`）时，未登录用户被重定向至 `/login?next=<original_url>`，登录完成后回跳 `next`。
- **空间驾驶舱迁移**：WebGL/3D 轮播组件（GX SPATIAL）收容于 `/spatial` 隐秘路由，仅对最高权限管理员开放。

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

### 4.4 底部三联导航协议 (Bottom Tabs Protocol)
- “我的”动态路由：未登录指向 `/me`，登录后指向 `/dashboard`，实现一跳直达身份仪表盘。
- 关闭底部 Tab 的自动预取：底部导航链接禁用预取以避免开发环境中 RSC 流被取消引发的 `net::ERR_ABORTED` 噪音。此为预期行为，不视为错误。
- `/dashboard` 作为受保护页面遵循延迟鉴权；页面内部根据角色执行降级渲染。

## 5. Supabase 顶端架构与零束缚法则 (Supabase Top-Tier & Zero-Bound Architecture)

### 5.1 统一模型与稳定契约层 (Unified Model & Stable Contract)
- **废弃多日历分表**：所有类型的日历、行业、资源，统一收敛至 `calendars`、`resources`、`bookings` 核心三件套，通过 `type` 与 `config` (JSONB) 区分，彻底解决多商户规模化后的查询与权限爆炸。
- **视图契约隔离 (View Contract)**：前端**绝对禁止**直接读写 `bookings` 物理表。必须通过 `v_bookings` 视图进行读取。视图层利用 `COALESCE` 提供稳定列名映射（如把底层的 `data->>'customerName'` 映射为前端需要的键），无论前端如何魔改 UI 或字段名，后端契约永不报错。
- **全局身份主表 (Profiles) 与延迟发号法则**：新增 `public.profiles` 主表作为跨域基石。所有真实用户必须分配唯一终身 `gx_id`（如 `GX-UR-000001`）。
  - **延迟发号防御**：绝对禁止在 `auth.users` 的 `AFTER INSERT` 阶段直接发号。必须使用 `AFTER UPDATE` 监听 `email_confirmed_at` 字段，只有当用户**真实填入验证码并验证成功**的瞬间，才调用 `gx_user_id_seq` 发号器创建档案。彻底杜绝脏数据占坑导致 `Unique Constraint` 崩溃。

### 5.2 终极灵活舱 (JSONB Envelope & Zero Constraints)
- **宽读宽写原则**：为了实现“想怎么约就怎么约”的零束缚，除了维持系统运转的最小必填项（`shop_id`, `date`, `start_time`, `duration_min`）外，所有前端表单的动态变动（如备注、颜色、自定义客户名、自定义服务名等）一律塞入 `bookings.data` (JSONB) 字段。
- **免迁移扩容**：前端任意增删改 UI 控件与字段名，无需执行任何数据库 DDL 迁移，前端永远不会收到“找不到字段”的红字报错。

### 5.3 数据库级物理防爆 (Physical Anti-Collision)
- **时间重叠排他锁**：利用 PostgreSQL 的 `tsrange` 数据类型结合 `EXCLUDE USING gist` 索引，在数据库最底层建立 `prevent_overlapping_bookings` 约束。
- **纳秒级防幽灵双占**：无论前端是否存在 Bug 或弱网重复提交，数据库会在纳秒级自动拦截同一门店 (`shop_id`) 下，同一资源 (`resource_id`) 的时间重叠，彻底消灭高并发下的逻辑错。

### 5.4 事件溯源与分离分析 (Event Sourcing)
- **写轻读重**：所有预约状态流转（创建、确认、爽约等）必须写入 `booking_events` 事件表；所有资金流水写入 `transactions` 表。
- **AI 数据源解耦**：后期的 AI 财务报表与时间分析，绝不能耦合在日常预约的写入路径中。所有 AI 洞察与指标统计均通过物化视图或定时任务从事件与账本中派生，保障核心业务的绝对稳定。

### 5.5 大扫除与纯净直连协议 (The Purge & Zero-Cache Protocol)
- **全面废弃沙盒缓存**：系统已全面剥离 Vercel KV（Redis）与本地业务数据的 `localStorage` 缓存。前端在任何组件中**绝对禁止**使用 `localStorage.setItem/getItem` 来读写如 `staffs`, `services`, `bookings` 等业务核心数据，以防产生多端脑裂的“幽灵数据”。
- **斩断 Auth 假缓存拦截**：在 `useAuth` 提供者中，**绝对禁止**使用本地假缓存（如 `gx_sandbox_session`）去 `return` 拦截 `initAuth` 真实请求。无论发生什么，都必须让系统去 Supabase 的 `profiles` 表拉取真实数据。
- **直连与实时推送**：所有数据必须通过 `BookingService` 直连 Supabase 物理表（通过 `v_bookings` 视图读取）。跨端状态同步必须依赖 Supabase Realtime WebSocket 引擎，废弃所有本地模拟的 `window.dispatchEvent`。断网或未登录时，应表现为合理的白屏或加载状态，而非显示虚假的缓存数据。
 
 ## 6. 登录与鉴权准则 (Login & Auth)
 
 ### 6.1 登录入口与路由
- 根路由重定向 `/` → `/home`，所有用户默认以“游客态”浏览门户；/login 不再作为默认入口。
- 延迟登录：当用户访问受保护页面或执行受保护操作时，才进入 `/login?next=<original_url>`；登录完成后回跳至 `next`，若无 `next` 则回 `/home`。
- OAuth/Magic Link 回调统一至 `/auth/callback`，回调解析 `next` 并执行回跳；默认落地 `/home`。
- 角色降级渲染保持不变：Boss 独占 `/spatial`；Merchant 首次登录需完成行业 Onboarding 并写入 `shop_configs`；User 视图不渲染切换器。
 
 ### 6.2 登录界面 UI 规范
 - 主按钮优先“使用 GOOGLE 登录”，次要入口为“邮箱验证码登录”，二者材质与尺寸需统一。
 - 坚持极致清透与内敛发光材质：避免外扩柔光；统一圆角与间距；去网格化排版。
 - 表单 Label 使用正体与高对比度暗灰（如 `text-white/60`），录入文本使用亮白；青色仅用于聚焦或强调。
 
 ### 6.3 邮箱验证码与密码
 - 邮箱验证码长度固定为 6 位；“获取邮箱验证码”按钮需节流并防重复发送。
 - 错误提示统一放置在输入下方并保持一致语气与样式；禁止日志中输出验证码或密码等敏感明文。
 - **OTP API 强制调用法则**：在前端调用 `signInWithOtp` 时，**必须强制注入** `options: { shouldCreateUser: true }`，以强制 Supabase 生成 6 位纯数字验证码，而非纯魔法链接。
 - **邮件模板坑位防御与长哈希熔断**：自定义 HTML 邮件模板必须**同时全量覆盖** `Confirm signup` (新用户) 与 `Magic Link` (老用户) 两个配置项，确保新老用户体验绝对一致。模板内**绝对禁止**使用 `{{ .TokenHash }}` 变量（会导致排版被长哈希撑爆），必须且只能使用 `{{ .Token }}` 变量来渲染 6 位数字验证码。
 - **SMTP 防拦截降级法则**：若使用 QQ 等严苛的第三方 SMTP，邮件 HTML 必须采用最原始的 `<table>` 布局与内联 `style`，绝对禁止使用 `<style>` 标签块或复杂 CSS 类名，否则将被底层直接拦截导致发送失败。
 - **测试账号软拉黑规避 (Rate Limit)**：在开发测试期间，若手动在 Supabase 控制台删除了未验证的用户，该邮箱会被短暂拉黑导致收不到后续邮件。应使用邮箱别名大法（如 `test+1@qq.com`）绕过。

### 6.4 错误提示与安全
 - 密码或验证码错误采用内联提示，不暴露后端具体原因；统一颜色与密度，避免视觉噪音。
 - SSR Hydration 防御：与时间、随机值或本地缓存相关的渲染延后到挂载；必要文本使用 `suppressHydrationWarning`。
 
 ### 6.5 测试与验收清单
 - Google 登录：处理 OAuth 异常与浏览器弹窗拦截的回退提示。
 - 邮箱验证码：6 位校验、按钮节流、防重复发送、统一错误提示位置。
 - 密码登录：错误提示一致，不泄露敏感信息到控制台或网络日志。
- 路由与权限：`/` → `/home` 重定向；受保护页面未登录时跳转 `/login?next=<original_url>`；登录/回调后回到 `next` 或 `/home`；登录后根据角色进行降级渲染并验证越权熔断。

### 6.6 唯一管理员与环境变量安全
- 唯一管理员邮箱锁定为 `499755740@qq.com`，仅该邮箱被识别为 Boss 角色并解锁 `/spatial` 等特权入口。
- 管理员初始密码通过环境变量注入：`NEXT_PUBLIC_ADMIN_PASSWORD`；邮箱通过 `NEXT_PUBLIC_ADMIN_EMAIL`。必须存在于 `.env.local`，严禁写入代码或日志。
- 环境变量文件 `.env.local` 已被忽略，不得提交到版本控制；任何秘密信息不得在控制台或网络日志中输出。
- 真实 Supabase 环境与沙盒环境均需遵守此 gating；未配置环境变量时不得启用管理员直通。

### 6.7 管理员身份仪表盘单屏规范 (Admin Identity Dashboard)
- 单屏三段式结构：
  - 顶部身份信息：头像 + 名称/ID，去除冗余页头文案，聚焦身份锚点与操作。
  - 第二行核心入口：保留“全景驾驶舱 / Spatial Cockpit”卡片作为主行动入口，仅 Boss 可见。
  - 账户区：显示“登录邮箱”与“初始化登录密码”。邮箱可复制；密码默认遮罩，支持显示/隐藏与复制。
- 安全与来源：
  - 邮箱以当前登录用户为准；初始化密码来源于 `NEXT_PUBLIC_ADMIN_PASSWORD`，未配置则隐藏复制动作。
  - 默认遮罩显示，显示/隐藏只影响本地 UI；禁止将邮箱/密码写入日志或通过网络发送。
- 底部操作区：
  - 提供“切换为商户视图 / 用户视图”与“退出系统”按钮；切换仅改变降级渲染，不提升权限。
- 视觉约束：
  - 保持极致清透与内敛发光材质；信息密度控制在 `text-white/40~60`；危险动作使用 `danger` 风格。

## 7. 开发与预览环境准则 (Dev & Preview)
- 开发服务器端口锁定为 `3000`；若端口占用应优先释放占用进程，再启动本项目。禁止随意切换到其他端口造成链接不一致。
- 预览链接统一使用 `http://localhost:3000/`，页面路径保持不变（如 `/calendar`, `/home`）。

## 8. 背景壁纸高清显示规范 (Wallpaper HD)
- 壁纸资源统一放置于 `public/images/backgrounds`；使用 4K/高清素材。
- 渲染层使用 `background-size: cover`、`background-position: center`、`background-repeat: no-repeat`，确保无拉伸与平铺失真。
- `showWallpaper` 默认开启；如需极致清晰可在“矩阵背板”调低或关闭模糊与遮罩。星云层作为动效叠加，可按性能需要切换。

## 9. React 并发与事件总线安全 (Concurrency Safety)
- 禁止在 `useEffect` 中进行无必要的同步 `setState` 初始化；应使用惰性初始化从本地存储或外部源读取。
- 通过事件总线（如 `window.dispatchEvent`）触发跨组件状态更新时，必须使用并发友好的过渡任务（如 `startTransition`）以避免“在渲染期间更新其他组件”的错误。
- **状态同步法则**：从外部 Props（如 `profile.avatar`）同步到内部 State（如 `localAvatar`）时，**绝对禁止**使用 `useMemo`，这会丢失异步更新；必须使用 `useEffect` 配合依赖数组以确保渲染闭环。

## 10. 跨域身份联动架构 (Cross-Domain Identity Fusion)
- **双轨 ID 系统**：B端（日历）与 C端（我的页）数据通过 `phone` 字段实现跨域融合。
- **降级渲染**：在 B 端输入手机号时，需防抖查询 `profiles` 表。匹配失败时降级为游离态散客（暗灰头像，仅显示内部流水号如 `CO 0015`）；匹配成功时，启动双轨并行显示：左侧全息头像 + 中层流水号 + 下层尊贵 `GX-ID`。
- **防呆查询**：所有基于手机号的查询必须执行 `.trim()`，避免不可见空格导致查询失败。

## 11. 门户冷启动聚合架构 (Cold-Start LBS Aggregation)
在系统前期缺乏真实入驻商家时，门户首页 (`/home`) 采用 **Google Places API (New)** 进行周边数据聚合，必须严格遵守以下**“极限控本与降维打击”**法则：
- **服务端防泄漏**：绝对禁止在前端暴露 API Key。所有 Google API 请求必须通过 Next.js 后端路由 (`/api/places`) 转发，使用 `X-Goog-Api-Key` 请求头安全调用。
- **FieldMask 极限控本**：调用 `searchNearby` 时，必须强制使用 `X-Goog-FieldMask` 拦截高价字段（如照片、评论），仅请求最基础的廉价字段：`places.id,places.displayName,places.rating,places.userRatingCount,places.businessStatus,places.location`。
- **视觉欺骗与降维渲染**：前端绝不调用昂贵的 Google Photo API。统一使用预设的高质感、赛博朋克风 Unsplash 占位图（如 `MOCK_IMAGES`），配合真实的名字与评分渲染卡片。
- **内存伪分页 (Phantom Pagination)**：鉴于 Google `searchNearby` 单次请求物理极限为 20 条，后端一次性拉满 `maxResultCount: 20` 存入前端内存。前端初始化仅渲染 5 条（`slice(0, displayCount)`），用户点击“加载更多”时无网络开销瞬间释放后续数据，直至 20 条耗尽，拒绝使用昂贵的 `nextPageToken`。
- **深链引流闭环**：用户点击卡片查看详情时，禁止在站内做复杂的详情渲染，必须直接利用 `window.open` 构造 URI (`https://www.google.com/maps/search/?api=1&query=商家名`)，将流量导向 Google Maps 原生应用实现降维打击，并达成 100% 合规。
- **主动重定位雷达**：必须提供“准星/雷达”按钮，允许用户清空当前列表并强制重新触发 `navigator.geolocation` 校准坐标，解决 HTML5 定位漂移问题。
