# Rapallo 收银台项目进度备忘录 (Checkpoint)
*更新日期: 2026-03-07 (最新同步 - 已优化交互与颜色逻辑)*

本文档作为项目逻辑与进度的“记忆库”，旨在减少长对话中的上下文重复，并作为核心逻辑的快速参考。新对话开始时，请让 AI 助手阅读此文件。

## 0. 项目部署与环境信息 (Deployment & Environment)
- **GitHub 仓库**: `https://github.com/FX-ESTETICA/fx-.git`
- **生产环境 (Vercel)**: `https://fx-rapallo.vercel.app`
- **环境变量 (Supabase)**:
  - `NEXT_PUBLIC_SUPABASE_URL`: `https://otkzntibwinszparrkru.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `sb_publishable_zvSB8MZJ4T_Oq51aNlzMEg_gDl1HeBM`

## 1. 已实现的核心逻辑 (Stable Features)

### A. 服务项目、价格与时长配置 (Calendar.tsx)
- **核心数据结构**: `serviceCategories` 常量定义了所有服务。
  - **Mani**: Mn(20m), Ms(45m), Rc(90m), Rt(75m), Cop(75m), T.s(5m), T.g(15m)
  - **Piedi**: Pn(30m), Ps(60m)
  - **Ceretta**: Sop(5m), Baf(5m), Asc(10m), Bra(20m), Gam(30m), In(20m), Sch(20m), Pet(20m), Pan(10m)
  - **Viso**: EX.ciglia(120m), Rt.ciglia(75m), L.ciglia(60m), C.ciglia(60m), L.sop(60m), C.sop(60m), P.viso(60m)
- **自动时长计算**: 
  - 使用 `useEffect` 监听 `newTitle` 的变化。
  - 自动累加所选项目的 `duration` 并更新 `duration` 状态和 `selectedEndDate`。
  - **动态下拉菜单**: 持续时间 select 框会自动添加当前累计的时长选项（若不在预设列表中），确保显示准确。

### B. 预约与保存逻辑 (handleSubmit)
- **分段服务 (Sequential)**: 
  - **自动接续**: 系统自动从配置中读取每个项目的独立时长。
  - **时间链**: 第一个项目从 `selectedDate` 开始，后续项目自动以前一个项目的结束时间作为开始时间，实现无缝衔接。
- **同时服务 (Parallel)**: 所有项目共享相同的开始时间，并行插入数据库。
- **批量插入**: 使用 Supabase `insert` 批量处理多个 `eventData`。

### C. 技师与颜色系统
- **逻辑**: `itemStaffMap` 记录每个项目对应的技师。
- **UI 表现**: 项目文字颜色与技师颜色一致。
- **自动分配业绩**: 结账预览中，金额会根据项目归属自动分配给对应的技师。

### D. 界面布局 (UI/UX)
- **底部按钮**: 预约弹窗 footer 采用单行居中布局：`[分段服务]`, `[同时服务]`, `[收银结账]`, `[预约确定]` 并排显示。
- **滚动支持**: 按钮栏支持横向滚动，防止小屏幕溢出。

### E. 交互优化 (Performance & Interaction)
- **零延迟响应**: 移除了所有 `transition-*`, `duration-*`, `active:scale-*` 等动画类名，实现“点击即结束”的瞬时响应。
- **默认显示颜色**: 服务项目在未指定技师时，默认显示为蓝色 (`text-sky-400`)，与数据库保存逻辑保持一致。

## 2. 最近修复的问题 (Bug Fixes)
- **编译错误**: 修复了 `ViewType` 和 `MemberHistoryItem` 类型导入路径错误导致的 Vercel 部署失败。
- **newItems 引用错误**: 修复了 `toggleService` 中 `newItems is not defined` 的报错，统一使用 `items` 变量。
- **持续时间显示错误**: 解决了累计时长超过 150 分钟后 select 框显示为 15 分钟的 UI 渲染问题。

## 3. 待办事项与后续方向 (Next Steps)
- [x] 完善服务项目的具体持续时间配置。
- [x] 实现分段服务的自动时间衔接逻辑。
- [x] 移除所有 UI 过渡动画，提升操作流畅度。
- [x] 统一未分配人员时的默认蓝色显示。
- [ ] 验证在高并发操作下的数据库同步稳定性。
- [ ] 考虑增加“拖拽调整”分段服务顺序的功能。

---
*注：新对话开始时，请直接发送“阅读 MEMO.md”即可让助手恢复上述所有记忆。*
