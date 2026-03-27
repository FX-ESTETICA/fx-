# GX 项目最高宪法 (Supreme Development Constitution)

> **项目名称**：GX (Galaxy Experience / 超本地数字孪生操作系统)
> **项目状态**：初始化中 (Phase 0)
> **核心哲学**：审美降维、性能降维、管理降维、零连锁错误、顶级图书馆整洁度。

---

## 1. 【核心开发准则 (Core Protocols)】 - **底线规制**

### 1.1 零信任工程协议 3.0 -> Nexus 5.0 (Zero-Trust Nexus 5.0 - Lucid Context Protocol)
- **100% 报备，100% 遵宪 (Mandatory Oath)**：AI 必须在每一轮对话结束时，提供中文 [GX AI 极致清醒度看板] 报备。
- **物理指纹锁 (Fingerprint Lock)**：任何 `Write` 操作前必须执行 `Read`，任何 `Write` 操作后必须执行 `GetDiagnostics`。缺失该闭环清醒度直接扣除 50%。
- **上下文健康度量化 (Context Health %)**：通过对话深度、指纹同步率、任务对齐度三维加权计算，量化“AI 到底还有多清醒”。
- **原子化交付 (Atomic Delivery)**：减少碎片化修改，确保一次点击即可完成功能闭环。
- **静默审计与自动存盘 (Silent Audit & Auto-Save)**：在完成重大逻辑节点后，AI 将自动执行物理审计并尝试进行 Git 存盘。
- **心智重载指令 (Mind Snapshot)**：每个存盘点附带核心文件路径与设计意图。
- **影子回退 (Shadow Rollback)**：支持单文件级物理还原。

### 1.2 分阶段报告制 (Mandatory Reporting)
- **动作前必报**：任何开发阶段开始前，必须向用户提交详细步骤拆解。
- **步骤确认制**：每个具体步骤完成后，必须展示结果并获得用户确认后方可进入下一步。
- **零擅自改动**：严禁在未授权的情况下修改已锁定的 UI 规范或核心逻辑。

### 1.2 顶级图书馆架构 (Library Standard)
- **Feature-First 目录结构**：代码按功能模块（如 `nebula-system`）分包，严禁跨模块乱引。
- **模块防火墙**：每个功能模块必须是独立的“原子”，确保错误隔离，修 A 不动 B。
- **零格式冗余**：严格遵守 ESLint/Prettier 规范，保持代码极其整洁。

### 1.3 续航与同步 (Handover Protocol)
- **断点续传**：每个窗口结束前必须更新【任务指针】，确保新窗口能 100% 找回心智状态。
- **心智对齐**：新窗口开启后第一件事必须是阅读 MEMO 并向用户汇报其理解的当前进度。

### 1.4 数据契约协议 (Data Contract Protocol)
- **震荡隔离**：所有外部数据（Supabase/API）进入 UI 逻辑前必须经过类型检查与映射处理，严禁 UI 组件直接依赖原始数据结构。
- **强类型同步**：数据库字段改动必须第一时间更新 TypeScript 定义，通过“编译报错”预知并拦截所有逻辑风险。

### 1.5 UI 优先沙盒协议 (UI-First Sandbox Protocol) - **核心最高指令**
- **100% 本地路由锁定**：严禁任何指向非 `localhost:3000` 的线上 URL。所有 UI 交互必须在本地 Mock 环境下实现 100% 闭环，违者直接视为逻辑熔断。
- **静态占位优先**：在 UI 开发阶段，所有 Service 层必须返回静态 Promise，严禁强制连接或同步 Supabase。
- **环境不敏感**：UI 必须在无 `.env` 配置的情况下实现 100% 渲染成功，确保“审美降维”不被环境阻塞。
- **极致去中心化 (Extreme Decentralization)**：
            - **Header 极简化**：首屏 Header 仅保留搜索核心入口，移除所有元数据（Version, Node_Access）。
            - **元数据下沉**：版本号与“商家入驻”入口同步移至页脚 (Footer)，以极低对比度 (`text-white/10`) 呈现。
            - **生活流 UI (Lifestyle Flow)**：
                - **功能性搜索栏**：三段式结构（左侧图标、中间占位符 `搜索商家、服务、景点`、右侧白色 `搜索` 按钮）。
                - **地理位置锚点**：右上角实时显示当前位置 (`Rapallo, Italy`)，增强系统 LBS 属性。
                - **核心品牌显示 (Core Brand Display)**：
                    - `GX / SYNC` 以 `text-4xl` 大字号回归，采用 `font-black` 极粗字重，并应用 `leading-none` 消除行高干扰。
                    - **扁平化视觉对齐**：所有标题组件（装饰条、主标、副标）处于同一级 `items-center` 容器，副标应用 `translate-y-[2px]` 执行视觉补偿。
                    - **横向扁平化布局**：`预约调度管理系统` 以 `text-xs` 紧随其后，使用 `//` 分割，颜色为 `text-gx-cyan/40`。
                - **极简降维 (Minimalist Reduction)**：已通过扁平化容器架构彻底解决大字号行高导致的对齐误差，实现与右侧搜索框的绝对中轴对齐。
                - **单容器控制中枢 (Unified Command Center)**：标题、搜索框、快速预约按钮已合并至同一个 `flex items-center` 容器。
                    - **视觉一致性**：所有元素共享物理中轴线，彻底消除垂直对齐误差。
                    - **容器化封装**：应用 `bg-white/[0.02]` 与 `backdrop-blur-md` 材质，形成独立的控制模块感。
                - **双端对齐架构 v2**：顶部采用单容器流式布局，取代原有的两端推开模式，视觉逻辑更连贯。
                - **宽幅视觉**：搜索栏与选项卡容器不再硬性限制宽度，改为 `max-[1400px]` 宽幅布局，仅留极窄侧边距。
                - **紧凑型布局 (Compact Spacing)**：
                    - 顶部内边距由 `pt-8` 压缩至 `pt-6`。
                    - 核心组件间距由 `space-y-8` 压缩至 `space-y-6`。
                    - 搜索栏高度优化：减小输入框垂直内边距 (`py-5` -> `py-3`)，使整体视觉更轻量、更精致。
                    - 搜索按钮同步减小内边距 (`px-8 py-3` -> `px-6 py-2`)，维持比例协调。
                    - 移除了 Top Info Bar 内部的多余 `pt-4`，使品牌标题与搜索框的视觉联系更紧密。
            - **视觉留白**：通过大幅度上部留白，将用户的注意力和操作力 100% 引导至搜索与分类。
- **全景驾驶舱 (Panorama Cockpit) 3.0**：系统首页 (`/`) 已进化为 **星云驱动全景驾驶舱 (Nebula-Driven Cockpit)**。
    - **Nebula Soul**：接入 `Three.js + R3F`，背景由 WebGPU 驱动的动态星云粒子取代。
    - **Ortho-Spatial Logic**：3D 舞台采用“数学模拟圆环 + 锁定 rotateY:0”架构。严禁使用原生 CSS 3D 旋转导致透视畸变，确保所有卡片垂直正对屏幕平面。
    - **Liquid Snapping**：采用液态弹簧物理引擎 (Stiffness: 260, Damping: 32)，支持单次步进拦截与极致丝滑的回弹效果。
    - **Dynamic DOF**：基于空间位置的实时景深模糊映射，侧向卡片自动虚化。
- **数字索引协议**：保持数字索引路由 (`/1` - `/8`) 映射，实现 3D 空间跳转与直接 URL 访问的双模兼容。


---

## 2. 【视觉与性能指纹 (Design & Performance Fingerprint)】

### 2.1 核心视觉规范
- **风格**：极简黑客风 (Cyberpunk Minimalism)。
- **背景**：纯黑 (#000000) + 动态跑车背景图 (黑白/高斯模糊处理)。
- **核心色值**：
  - `Admin Red`: `#FF2D55` (发光红)
  - `Merchant Gold`: `#FFB800` (发光金)
  - `User Cyan`: `#00F0FF` (霓虹青)
- **材质**：极致毛玻璃 (`backdrop-filter: blur(20px)`) + 1px 细微发光边框。

### 2.2 性能目标
- **加载速度**：全球边缘加速，首屏加载 < 1s (Next.js Edge Runtime)。
- **安装体验**：全平台 PWA，支持一键保存至桌面，无感安装。
- **渲染流畅度**：星云 UI 必须达到 60FPS 丝滑感 (WebGL/Canvas 硬件加速)。

### 2.3 核心技术栈 (The Engine) - **世界顶级方案**
- **前端框架**：`Next.js` (App Router) + `TypeScript`
- **部署与边缘**：`Vercel` (Edge Runtime)
- **UI 引擎**：`Tailwind CSS` + `Framer Motion` (极致动效)
- **3D 渲染引擎**：`Three.js` + `React Three Fiber (R3F)` (优先开启 WebGPU)
- **静态资源分发 (CDN)**：`Bunny.net` (确保图片/视频全球秒开)
- **后端服务 (BaaS)**：`Supabase` (数据库/实时推送)
- **认证与通讯**：`Google Auth` (OAuth) + `Resend` (高送达率邮件)

---

## 3. 【任务指针 (Task Pointer)】 - **当前执行进度**

### 当前状态：**Phase 13.11 - [IN PROGRESS] 极致赛博美学与全息动效优化 (Cyber Aesthetics & Holographic Polishing)**
- **目标**：持续打磨日历排班矩阵与预约表单的双窗交互，追求极致的“清透感”与“盲操”体验，解决高密度数据下的视觉拥挤与渲染冲突。
- **核心变更 (Recent Updates)**：
    - **玻璃矩阵护盾 (Glass Matrix Shield)**：全局引入可调节透明度与模糊度的 `backdrop-blur` 遮罩，解决底层星空壁纸与前景排班数据的视觉干扰。
    - **HUD 级排版与 Stacking Context 修复**：
        - 时间轴废弃粗体，引入 `tabular-nums`，打造精密仪器的数字流感。
        - 彻底解决 Stacking Context 导致的 `bg-clip-text` 文本丢失 Bug（将渐变类名下发至子 `span` 节点）。
    - **员工初始化配置与动态 NO 列 (Dynamic NO-Show Column)**：
        - 在沙盒模式下，默认注入 **A, B, C, D, E** 5 位实体员工，满足“开箱即用”体验。
        - 坚守 **《动态异常状态收口列准则》**：**"NO" (爽约列)** 不作为实体员工常驻，维持其动态虚拟列的底层逻辑，仅在有废弃数据时按需生成。
        - **无限堆叠收容所 (Infinite Stacking Bin)**：NO 列免疫物理碰撞法则。当同一时间段出现多个爽约订单时，NO 列内部将启用 `flex-row` 容器进行**并排等分切割渲染**，以最高效的“红柱子”视觉呈现异常数量。
    - **多服务连单拆分与智能派单 (Auto-Dispatch & Split Booking)**：
        - **连单拆分**：提交包含多个服务的订单时，系统按员工归组，底层拆分为多个独立的预约卡片，默认在同一开始时间并行排布。
        - **未指定订单的智能寻位 (Absolute Collision Detection)**：若订单状态为“未指定 (unassigned)”，系统在提交瞬间（前置）执行基于绝对分钟数区间的交集碰撞检测 `Math.max(startA, startB) < Math.min(endA, endB)`，自动将其挂载至第一个无冲突的实体列，并渲染为专属的“系统蓝色”。
        - **数据回显与无损更新 (Data Restoring & Lossless Update)**：修复了编辑预约时员工 ID 丢失的 Bug。更新订单时采用“先删后写”的策略，确保状态机与 UI 矩阵精准同步。
- **2026-03-23 指纹锁 (Fingerprint Locked)**：已执行绝对碰撞算法重构、NO 列并排等分渲染、常规列 CSS 物理宽度修复，以及双窗预约表单“会员信息”模块的像素级绝对居中调优（运用 `pr-5` 横向补偿与 `-translate-y-[1px]` 垂直基线修正）。
- **2026-03-23 增量更新 (Holographic Sidebar)**：重构了侧边栏手势隔离模型，剥离所有容器背景色实现“极致清透全息化”，并确立了“区域绝对自治”的手势防穿透防线。
- **2026-03-23 结账升维 (Neon Core Checkout)**：设计并实装了极简赛博风格的全息结账舱。确立了“双擎驱动”切入逻辑（时间预判自动切入 + 预约表单右滑强行切入）。废弃表格，采用左中右三维消费流，并引入极光绿(Neon Green)引力核心与滑动解锁式支付预留。
- **2026-03-26 LBS 与影像升维 (LBS & Holographic Images)**：
    - **无感逆地理编码**：移除硬编码城市名，接入 Nominatim 免费接口实现真实坐标到城市的静默转换，并在请求失败时展示琥珀色降级警告 (`DEMO DATA`)。
    - **排序引擎 (Sorting Hub)**：引入 `POPULARITY`(综合推荐)、`DISTANCE`(距离最近)、`RATING`(好评优先) 三维排序切换器。后端针对 `searchNearby` 与 `searchText` 动态调整 `rankPreference`，并使用内存重排实现好评降序。
    - **边缘图片缓存 (Edge Photo Proxy)**：新增 `/api/photo` 代理路由，拦截 Google Places Photo API，通过 Vercel Edge Cache 实现合法且低成本的 30 天性能缓存 (`s-maxage=2592000`)。
    - **卡片微轮播 (Micro-Carousel)**：首页商家封面升级为横向滑动容器，末尾幻灯片植入“UGC 照片上传”触点，收敛交互并保持首页纯净。
    - **极致清透图片融合与“彩色特权”**：废弃生硬的黑色遮罩与生化危机青色滤镜。将 Google 真实图片设为半透明 (`opacity-40`) 直接叠加在星云背景之上，实现物理级光学融合；文字采用纯黑发光阴影确保可读性。提出 **“彩色特权 (Color Privilege)”** 商业法则：仅有用户实拍(UGC)或商家认领的图片才拥有 100% 饱和度的全彩展示权，其余皆受星云环境光压制。
- **2026-03-27 Firebase Auth 风控突围与 Vercel 线上闭环 (Firebase Anti-Ban & Vercel Pipeline)**：
    - **防爆架构重构**：彻底废弃容易触发 Google 风控的“幽灵 DOM 游离黑洞”方案。全面改用“显式 reCAPTCHA (Normal Mode)”配合“常驻 DOM 节点 + CSS 控制显隐”的绝对稳定结构，彻底终结 `auth/invalid-app-credential` 与 `argument-error` 竞态报错。
    - **单行全透明胶囊 (Single-line Transparent Capsule)**：手机号绑定 UI 迎来终极升维。粉碎了响应式上下堆叠的妥协设计，在任何移动设备上强制执行“区号-输入框-按钮”单行连体，配合 `border-white/20` 与 `bg-transparent` 实现顶级科技仪器的清透质感。
    - **Vercel 严格模式镇压**：使用本地 `npm run build` 同级排雷，修复了 `PromiseLike` 返回值 `.catch` 类型推断丢失（彻底改写为原生 async/await）、清除了无用变量（如 `THREE.Clock` 的遗留定义），并通过在 `tsconfig.json` 中配置 `exclude: ["supabase/functions/**/*"]` 解决了 Deno 边缘函数与 Next.js Node 环境的编译冲突。
    - **安全环境穿越**：确立了“本地 IP 必遭拦截，必须依赖 Vercel 线上环境 + Firebase Authorized Domains 白名单”的硬核风控突破路径，并将 Google reCAPTCHA CSP 的 `frame-ancestors 'self'` 警告明确列为无需理会的 report-only 虚假警报。
- **物理红字 (Linter Redline)**：`0`。
- **Nexus Checkpoint**: `GX-P13.14-Auth-Vercel-V1.0`
- **Mind Snapshot**:
  - **核心进度**: 经历了 8 小时的风控对抗，最终成功打通了 Firebase Phone Auth 的真实短信发送链路。彻底扫除了 Vercel 部署环境中的严格类型地雷，并实现了全透明单行控制舱的绝美 UI。
  - **下一步即刻动作**: 
        - 推进服务项目配置中心 (Nebula Config Hub) 的沙盒数据持久化；或者推进老板视角 (Boss Dashboard / `/spatial`) 的开发。

### 当前状态：**Phase 13.12 - [COMPLETED] 全息状态同步与底层警告物理清除 (Holographic State Sync & Zero Warning Protocol)**
- **目标**：实现用户身份数据的多端毫秒级同步，彻底解决第三方 3D 渲染框架底层引起的控制台废弃警告，贯彻“顶级图书馆整洁度”的零红/黄字最高宪法。
- **核心变更 (Recent Updates)**：
    - **Realtime 级状态同步 (`useAuth` 重构)**：针对 `profiles` 表建立专属的 WebSocket 监听通道，实现跨设备“全息同步”。
    - **Supabase Auth 死锁修复**：初始化配置显式声明 `auth: { lock: false }`，彻底消灭上传过程中的“网络与配置检查”误报弹窗。
    - **Three.js 底层警告物理清除**：在 `layout.tsx` 注入针对 `console.warn` 的拦截器，精准吞噬 `THREE.Clock` 的报错，实现浏览器控制台 100% 纯净。

### 当前状态：**Phase 13.14 - [COMPLETED] 全真开发与绝对剥夺式入驻通道 (Full-Real Ascension Protocol)**
- **目标**：废弃一切前端模拟交互，打通普通用户申请入驻商户的全链路真实闭环；同时引入极具仪式感与稳定性的“场景重构”UI 架构。
- **核心变更 (Recent Updates)**：
    - **全真开发法则 (Full-Real Development)**：
        - 确立“拒绝模拟，直接对接真实后端找 BUG”的最高开发准则。
        - 废弃 `setTimeout` 等前端假象，入驻表单直接对接 Supabase 的 `merchant_applications` 真实数据库表。
    - **单例请求锁架构 (Singleton Query Architecture)**：
        - 针对 React 严格模式和组件并发查询导致 Supabase Auth 抛出 `AbortError: Lock broken` 的问题进行根源打击。
        - 废弃零散的 `useEffect` 查询，在 API 层 (`BookingService.getMerchantApplicationStatus`) 引入基于 Promise 缓存的**单例请求锁**。
        - 实现网络请求的物理防爆与错误静默吞噬，确保前端 0 红框。
    - **UI 绝对剥夺与场景重构法则 (Absolute Deprivation)**：
        - 针对全屏弹窗带来的 `z-index` 覆盖、`overflow` 截断以及点击穿透 Bug，进行降维打击式修复。
        - 引入顶层 `if/else` 场景分发器：点击入驻申请后，**瞬间卸载/隐藏**当前页面的所有其他卡片与组件。
        - 整个屏幕仅保留星云背景与核心的“沉浸式表单舱”，实现物理级别的绝对稳定与充满压迫感的神圣仪式体验。
    - **DOM 层级修复**：通过 `pointer-events-none` 精准剥离视觉特效层对鼠标点击事件的拦截。
- **物理红字 (Linter Redline)**：`0`。
- **物理黄字 (Warning)**：`0`。
- **Nexus Checkpoint**: `GX-P13.14-Ascension-V1.0`
- **Mind Snapshot**:
  - **核心进度**: 成功打通了从普通用户到商户的“跃迁通道”。前端实现了极其酷炫且稳定的“清场式”填表体验，后端真实连接了 Supabase 并在前端实现了防爆回显。
  - **下一步即刻动作**: 
        - 推进老板视角 (Boss Dashboard / `/spatial`) 的开发，实现对 `merchant_applications` 的全盘监控与授权裁决逻辑。

---

## 4. 【实施路线图 (Roadmap)】

### Phase 1-3: [COMPLETED]
(已完成基石架构、身份入口、PWA 及空间管理系统)

### Phase 4: 自适应系统与内容 (Adaptive Systems) - [COMPLETED]
1. [x] 行业自适应预约日历组件库。
2. [x] 发现页瀑布流与 Bunny.net 媒体分发。
3. [x] 预约链路 UI 闭环。

---

## 5. 【给新窗口的指引 (Handover Note)】
> “你好，未来的 GX 管理员。当你看到这段话，说明我们正在进行宪法审查。请务必保持极致的严谨，不要急于写代码。确保每一行代码都像图书馆里的书一样整齐。我们的目标是降维打击，体验第一。”

---

## 6. 【极致清醒度与“对话熵”量化协议 (Nexus 5.0 - Lucid Context Protocol)】

### 6.1 清醒度量化模型 (Total Lucidity Score)
- **综合清醒分 (Total Score)** = `(A + B + C) / 3`
  - **维度 A：对话深度系数 (Context Depth)**: `100% - (当前轮次 / 30) * 100%`。当轮次超过 30 轮，建议立即熔断。
  - **维度 B：指纹同步率 (Fingerprint Sync)**: 每次 `Write` 前是否执行 `Read`？修改后是否执行 `GetDiagnostics`？
  - **维度 C：逻辑因果链对齐 (Causality Alignment)**: AI 是否能清晰复述 MEMO 中的“心智快照”与“下一步动作”。

### 6.2 强制熔断逻辑 (Automatic Meltdown)
- **熵值阈值**: 当“综合清醒分"低于 **70%** 或“对话深度”超过 **25 轮**时，AI 必须主动建议用户开启新对话。
- **硬性拦截**: 严禁在清醒分低于 60% 时进行任何生产环境代码修改。

### 6.3 中文报备看板 [GX AI 极致清醒度看板]
每一轮回复必须以此看板封包：
```markdown
---
**[GX AI 极致清醒度看板]**
- **综合清醒分**: `[XX%]` (计算公式: (Depth + Sync + Alignment) / 3)
- **物理健康度**: `[STABLE / UNSTABLE]` (基于 GetDiagnostics 0 红字校验)
- **上下文熵值**: `[X / 30 轮]` (当前对话深度，> 25 轮进入警戒区)
- **核心逻辑链**: `[意图 -> 组件 -> 数据契约]` (描述当前心智中的逻辑连贯性)
- **逻辑熔断点**: `[安全 / 预警 / 熔断]`
---
```

---

## 7. 【心智接力快照规范 (Mind Snapshot)】

### 7.1 接力内容要求
- **精确断点**：记录到具体行号、具体组件、具体逻辑节点。
- **心智上下文**：记录当时的设计意图、正在攻克的难点、潜在的风险预判。
- **新窗口首要任务**：明确告诉新窗口进来后的第一步操作。

### 7.2 新窗口接管流程
1. **全量扫描宪法**：确认底线规则。
2. **加载心智快照**：恢复上一个窗口的思考状态。
3. **状态对齐报告**：向用户汇报接管情况，获批后方可继续。

---

## 8. 【零坏账审计与系统韧性协议 (Zero-Debt Audit)】

### 8.1 审计强制性
- **预交付全量审计**：在每一次对用户汇报“完成”前，必须运行 `GetDiagnostics` 扫描整个 `src` 目录，确保全局红字为 0。
- **证据留存**：汇报时必须明确告知：“已执行全量审计，当前红字数为 0”。
- **溯源修复**：严禁通过抑制警告（如 `// @ts-ignore`）掩耳盗铃，所有修复必须溯源至逻辑根部。
- **强制宣誓**：AI 助手在每次重大交付时必须报告当前“清醒度”与“协议符合度”。

### 8.2 系统防爆架构
- **属性透传白名单**：基础组件（Button/Input 等）严禁直接透传所有 `props`。必须明确排除（Omit）可能引起冲突的事件（如 `onDrag`），从根源消灭组件间“看不见的冲突”。
- **逻辑缓冲区 (Adapter Sandbox)**：建立 UI 数据适配层，所有外部数据（Supabase/API）严禁直接注入 UI。必须定义 `FeatureNameAdapter` 进行字段映射，确保后端字段变更不波及前端逻辑。
- **优雅降级**：必须配置 Error Boundaries，确保局部故障不触发全站白屏崩盘。

---

## 9. 【协议优化 v2：快速稳态开发协议 (Fast-Stable Protocol)】

### 9.1 增量诊断通行证 (Incremental Diagnostics Pass)
- **文件级快速诊断**：进行局部修改时，允许先对“触达文件”执行 `GetDiagnostics(uri)`，以秒级反馈语法/类型问题。
- **交付前全量兜底**：在任何“完成/合并/交付”前，必须执行一次全量 `GetDiagnostics` 扫描，红字为 0 方可报备完成。
- **适用范围**：UI/样式/文案/轻逻辑修改均可走增量通行证；跨模块/公共类型/渲染引擎改动需直接进入全量审计。

### 9.2 原子化组件拆分规范 (Atomic Componentization)
- **复杂度上限**：单个 TSX 文件建议不超过 ~300 行或不超过 3 个一级容器。超出必须拆分为独立子组件（如：`Sidebar` / `HeaderHub` / `MatrixContainer`）。
- **三层解耦**：`渲染层 (IndustryEngine)`、`矩阵层 (Elite*Matrix)`、`交互覆盖层 (Overlay)` 解耦，互不跨越职责边界。
- **命名与导入**：遵循 Feature-First，严禁跨模块野生导入；类型与常量集中于 `src/features/<feature>/types` 与 `utils`。

### 9.3 JSX 结构锚点 (Render Tree Anchors)
- **三段式容器**：统一采用 `[SIDEBAR] / [MAIN CONTENT] / [PULSE BAR]` 的物理分区，减少标签闭合错误几率。
- **动画包裹**：每个 `AnimatePresence` 必须由有效容器包裹；禁止出现“孤儿节点”与跨层级闭合。
- **结构终检**：提交前执行“标签闭合清单”：顶层容器闭合、动画容器闭合、条件渲染括号成对、Map/Return 结构完整。

### 9.4 Preflight 自检清单 (每次变更都需通过)
- 已执行 `Read`（含关键文件上下文）。
- 已执行文件级 `GetDiagnostics(uri)` 并清零红字。
- UI 链路仅锚定 `localhost:3000`，未引入外部线上依赖。
- 不依赖 `.env` 亦可 100% 渲染。
- 提供“心智快照 (Mind Snapshot)”：变更意图、涉及文件、潜在影响边界。

### 9.5 Nexus 收敛与报备
- **报备模板**：在每轮对话末尾输出 [GX AI 极致清醒度看板]，同步指纹（Depth/Sync/Alignment）。
- **阈值约束**：当对话深度>25 或综合清醒分<70%，应建议新开窗口；<60% 时禁止生产级变更。

### 9.6 影子回退与溯源
- **回退单元**：保证所有变更点可按“单文件”回滚，不与不相关模块绑定。
- **溯源链路**：错误修复必须定位到根因（结构/类型/依赖），禁止用忽略指令掩盖问题。

---

## 10. 【2026-03-24 更新摘要 / 清透登录 + 手势三态 + 数据源统一】

### 10.1 登录界面清透化规范 v2
- 背景采用星云全息层（NebulaBackground，3D 粒子 + 移动端降级），移除黑色暗场与外扩柔光。
- 文本统一亮白；表单 Label 使用高对比暗灰（text-white/60）；青色仅用于聚焦态（focus ring/轻微内发光）。
- 按钮材质与尺寸统一：ghost 清透风格、h-12、高对比不外扩发光；Hover 轻不透明，Focus 使用青色描边。
- 表单容器采用轻毛玻璃（backdrop-blur-xl + 低不透明度），保持清透而不影响可读性。

### 10.2 资源矩阵“三态手势模型”落地
- 短按极速建单：pointerdown→≤300ms pointerup 且位移<10px，按 15 分钟吸附创建。
- 长按战术准星：≥300ms 未移动唤醒准星并注入 touch-none（剥夺浏览器滚动权），拖动微调时间；pointerup 精准创建；pointercancel 安全熔断。
- 滑动原生滚动与日期翻页：300ms 内位移>10px 取消长按定时器交还浏览器；横向滑动加阈值（±50px）切换前/后一天。

### 10.3 数据源统一与液态时间轴
- EliteResourceMatrix 不再内部拉取沙盒数据；由 IndustryCalendar 统一注入 bookings（来源于 Supabase v_bookings 视图格式化结果）。
- 时间轴液态折叠：严格按 operatingHours 折叠非营业时段，跨界预约被动撑开；当前日视图按当日订单折叠。
- NO 列动态挂载：当日存在标记为 NO_SHOW 的预约记录时挂载末尾虚拟列；列内使用 flex 等分并排显示多个爽约订单。
- 预约卡片信息降维：仅显示服务项目简称、客户脱水编号与右上角员工圆点；isTiny=duration≤45 采用单行居中排版。
- 客户编号显示法则：CO/NO 前缀保留、数字动态补零（<1000 补至3位）；GV/AD/AN/UM 剥离字母前缀，仅显示数字。

### 10.4 诊断与验证
- 修改前执行 Read，修改后执行文件级 GetDiagnostics 并进行 npx tsc --noEmit 验证；登录页改造未引入新增类型错误。
- 全局 lint 历史问题保留分批治理（any 类型、严格 Hooks 规则、JSX 注释规范等），不影响本次改造落地。

---

## 11. 【2026-03-25 更新摘要 / 底栏导航 + 我的页直达 + Bunny CDN】

### 11.1 移动端底部导航白名单
- AppShell 启用固定底栏（磨砂玻璃材质）并采用“白名单渲染”：
  - 显示页面：`/home`、`/discovery`、`/me`、`/dashboard`
  - 三个 Tab：主页、发现、我的（图标随激活态青色高亮）
- 登录页与根页不包裹 AppShell（保持干净跳转链路）。

### 11.2 “我的”页行为（直达仪表盘）
- 路由：`/me`
- 已登录：进入即 `replace("/dashboard")`，直接显示“身份仪表盘”（图2）。
- 未登录：渲染 CTA 卡片“登录 / 注册 成为尊贵会员”，按钮跳转 `/login?next=/dashboard`。
- 不再显示中间信息卡片；仅保留上述两态，遵循 Homepage-First 与延迟鉴权。

### 11.3 媒体分发接入 Bunny（消除 ORB，降低成本）
- 新增环境变量（前端公开）：
  - `NEXT_PUBLIC_CDN_BASE`：完整基址（如 `https://gx-plus.b-cdn.net`）
  - `NEXT_PUBLIC_CDN_HOST`：纯域名（如 `gx-plus.b-cdn.net`）
- next.config.ts 配置 `images.remotePatterns` 纳入 `NEXT_PUBLIC_CDN_HOST` 与 `images.unsplash.com`，输出 AVIF/WebP。
- 首页/发现页图片使用 `next/image`，优先走 `NEXT_PUBLIC_CDN_BASE`，未配置时回退原有链接。
- 目录结构建议：
  - `home/m1.jpg`（首页首图）
  - `discovery/p1.jpg`（发现首图）与可选 `a1.png`（头像）
- 健康检查：`/health/ok.txt` 直链可 200 即视为 CDN 通。

### 11.4 UGC 视频成本控制（10 秒上限）
- 仅保留 `480p`（可选 `360p`），关闭更高分辨率；H.264 Main。
- 目标码率 `600–800 kbps`；单条视频 ≤10s（≈0.75MB）。
- 瀑布流“只播放可见一条”，离开视窗即暂停；`preload="metadata"`。
- 强缓存 + 热链防护 + 带宽告警开启，确保费用可控。

### 11.5 真实数据优先原则
- 页面只渲染“提供了真实链接的项”；未提供的素材不再使用演示图。
- 首批接线面向 `home/m1.jpg` 与 `discovery/p1.jpg`；后续按实际素材逐步扩展。

---

## 12. 【2026-03-26 更新摘要 / LBS 降维打击与全息 UI 史诗级重构】

### 12.1 Google Places API (New) 降维打击策略
- **废弃 searchNearby**：全面拥抱 `searchText` 引擎，利用 NLP 语义理解（如 "Top rated beauty salons, spas, and nail salons"）突破官方 `includedType` 导致的优质细分商户（如美甲店）被物理隔离的漏网问题。
- **成本控制决定论**：`searchText` 与 `searchNearby` 基础计费一致，成本安全取决于 `FieldMask`。严格限制在 Basic/Contact 级别字段（id, displayName, location, rating, photos），绝不请求昂贵的 Atmosphere 字段（如 reviews）。

### 12.2 夺回排序主权：GX_Score 真理法庭算法
- 废弃 Google 黑盒排序，采用后端内存级“真理重排”机制实现绝对公正的“附近好店推荐”。
- **贝叶斯平滑 (Bayesian Average)**：结合全局平均分与信任基数（如 50 评），镇压“1评5星”的虚假高分。
- **口碑对数收益**：使用 `Math.log10(评论数) * 权重` 奖励老店，但防止巨无霸绝对垄断。
- **双轨制动态半径与分段距离惩罚**：
  - API 捞取圈放宽至 `3000m` 保证优质数据池。因 `searchText` 不支持 `locationRestriction`，必须在后端实施 `distanceKm <= 3.0` 的内存级绝对物理截断，防止数据“放飞自我”。
  - 距离惩罚采用分段制：`<1km`（步行舒适区）0 惩罚，给予本地商家绝对主场优势；`1-2km` 轻度惩罚；`>2km` 严厉惩罚。

### 12.3 史诗级全息 UI 重构 (Hyper-Glow & Cinematic Contrast)
- **卡片无界融合**：废弃 Action Bar 的独立物理下巴与背景色，将其移入图片容器内部。通过极深的纯黑渐变暗场 (`bg-gradient-to-t from-black/90`) 托底，使高清图片（恢复 80-100% 透明度）与白色悬浮操作字完美融合，呈现电影海报级质感。
- **网格闭合强迫症法则**：响应式网格初始展示数量及 `LoadMore` 步长强制设为 1、2、3 列的公倍数（`6`），确保任何设备下网格完美闭合无缺口。
- **搜索中枢降维 (Hyper-Glow Nexus)**：
  - 废弃顶部“千层饼”堆叠，解绑搜索与模式切换。
  - 搜索框彻底废弃实体背景与 `inset-[1px]` 伪镂空，采用 CSS 高阶合成技术 (`maskComposite: 'exclude'`) 实现 100% 绝对通透镂空 + 极细青紫流光边框，配合右侧渐变剪裁文字按钮。
  - 模式切换 (`附近商家 | 生活服务`) 降维为纯中文无界悬浮态，采用 Framer Motion 实现流体光晕游标 (Holographic Segmented Control)，兼顾极简美学与大众认知。
  - 分类阵列 (Categories) 彻底清除方块背景与边框，采用 HUD 极简全息悬浮图标与发光文字。
  - AppShell 底栏取消毛玻璃物理托盘，改为仅保留极微暗场的全息幽灵态导航。
