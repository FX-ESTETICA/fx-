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

### 当前状态：**Phase 9 - [COMPLETED] 全场景自适应验收与精致化交付**
- **最后一次操作**：全面实施了 **[自适应保真架构 (Adaptive Fidelity Architecture)]**；升级主容器为 `min-h-[100dvh]` 并引入 3D 舞台硬性高度锚定，彻底修复移动端布局坍塌；优化了移动端卡片比例 (180x240) 与旋转半径。
- **物理红字 (Linter Redline)**：`0` (已执行全量审计)。
- **Nexus Checkpoint**: `GX-P9-ADAPTIVE-FINAL-v1.5.0`
- **Mind Snapshot**:
  - **核心进度**: 实现了 PC 极致 3D 与移动端极致 2D/3D 混合布局的完美兼容，确保了 GX 审美在任何终端的 100% 亮屏显示。
  - **核心组件**: [page.tsx](file:///c:/Users/xu/Desktop/GX/src/app/page.tsx), [NebulaBackground.tsx](file:///c:/Users/xu/Desktop/GX/src/components/shared/NebulaBackground.tsx)
  - **逻辑节点**: 确立了“dvh 动态视口 + 硬性高度锚定 + 移动端比例重计算”为全场景适配的核心逻辑。
- **下一步即刻动作**: 深度审查二级页面的 Mock 内容适配，准备开启 Phase 10 核心业务逻辑注入。

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
