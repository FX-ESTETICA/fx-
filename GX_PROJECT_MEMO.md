# GX 项目最高宪法 (Supreme Development Constitution)

> **项目名称**：GX (Galaxy Experience / 超本地数字孪生操作系统)
> **项目状态**：初始化中 (Phase 0)
> **核心哲学**：审美降维、性能降维、管理降维、零连锁错误、顶级图书馆整洁度。

---

## 1. 【核心开发准则 (Core Protocols)】 - **底线规制**

### 1.1 零信任工程协议 3.0 -> Nexus 4.0 (Zero-Trust Nexus 4.0)
- **100% 报备，100% 遵宪 (Mandatory Oath)**：AI 必须在每一轮对话结束时，提供中文 [GX AI 清醒度宣誓] 报备。缺失报备即视为“逻辑违宪”，用户有权要求回滚至上一个 STABLE 锚点。
- **原子化交付 (Atomic Delivery)**：为了消除用户手动点击“保留”的摩擦力，AI 必须采用“大块逻辑合并交付”模式。减少碎片化修改，确保一次点击即可完成功能闭环。
- **静默审计与自动存盘 (Silent Audit & Auto-Save)**：在完成重大逻辑节点后，AI 将自动执行物理审计并尝试进行 Git 存盘（备注：GX-AUTO-SAVE）。
- **多维物理锚点 (Nexus Checkpoints)**：不仅是 Git 提交，必须包含代码、环境、元数据、心智状态四维一体的物理锁定。
- **物理清单驱动 (Manifest-Driven)**：在 `.gx/manifest.json` 中维护当前工程的物理健康度。
- **物理审计网关 (Physical Audit Gateway)**：所有 Checkpoint 必须经过 `GetDiagnostics` 0 红字校验。
- **清醒度物理量化 (Lucidity Quantification)**：清醒度不再是自我感觉，而是“AI 对物理状态、协议执行与任务指针三者的一致性对齐程度”。
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
- **星云/图形渲染**：`Three.js` / `PixiJS` (基于 WebGL)
- **静态资源分发 (CDN)**：`Bunny.net` (确保图片/视频全球秒开)
- **后端服务 (BaaS)**：`Supabase` (数据库/实时推送)
- **认证与通讯**：`Google Auth` (OAuth) + `Resend` (高送达率邮件)

---

## 3. 【任务指针 (Task Pointer)】 - **当前执行进度**

### 当前状态：**Phase 5 - [IN_PROGRESS] Supabase 集成与数据持久化**
- **最后一次操作**：安装 `@supabase/supabase-js` 并初始化 [supabase.ts](file:///c:/Users/xu/Desktop/GX/src/lib/supabase.ts)。
- **物理红字 (Linter Redline)**：`0` (已验证环境同步)。
- **Nexus Checkpoint**: `GX-P4-STABLE-v1.0.0` (当前为 P5 开发态)
- **Mind Snapshot**:
  - **核心组件**: [supabase.ts](file:///c:/Users/xu/Desktop/GX/src/lib/supabase.ts), [.env.local.example](file:///c:/Users/xu/Desktop/GX/.env.local.example)
  - **心智上下文**: 已建立 Supabase 客户端，准备定义 Booking 数据库契约并实现持久化。
  - **重载路径**: `Read(lib/supabase.ts) && Read(features/booking/types/index.ts)`
- **AI 物理分 (Integrity Score)**：`100/100` (环境就绪)。
- **下一步即刻动作**：定义 Booking 数据库契约并同步 TypeScript 类型。

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

## 6. 【逻辑熔断与清醒度自评协议 (Self-Awareness Protocol)】

### 6.1 清醒度等级定义
- **100% (巅峰状态)**：已执行 `Read(MEMO)`，`GetDiagnostics` 0 红字，且逻辑与 `Mind Snapshot` 完美匹配。
- **95% (警戒状态)**：对话轮次过多导致感知漂移，或出现报备缺失。
- **90% (强制熔断)**：逻辑出现矛盾，必须立即停止 `Write` 操作，强制重载 MEMO 并由用户确认回滚。

### 6.2 中文报备模板 [GX AI 清醒度宣誓]
每一轮回复必须以此格式封包：
```markdown
---
**[GX AI 清醒度宣誓]**
- **当前清醒度**: [100%] (原因: 已物理对齐 MEMO 宪法与任务指针)
- **协议执行度**: [100%] (Nexus 4.0 协议处于激活态)
- **物理审计状态**: [STABLE] (0 红字 / 0 警告)
- **存档锚点引用**: [GX-P4-STABLE-v1.0.0]
- **逻辑熔断状态**: [安全]
---
```
- **90% (强制熔断线)**：**极致完美防线**。一旦 AI 自感逻辑清醒度低于 90%，必须立即停止思考，禁止进行任何代码修改。

### 6.2 强制熔断触发逻辑
- **立即停止**：AI 判定逻辑不再处于 90% 以上的巅峰态时，必须立刻中断所有推理。
- **紧急存盘**：在 90% 清醒时完成最后一次 MEMO 同步，确保“心智快照”绝对准确。
- **重启指令**：明确告知用户开启新窗口，宁可重启 10 次，也不允许 1% 的逻辑瑕疵。

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
