# Rapallo 收银台项目进度备忘录 (Checkpoint)
*更新日期: 2026-03-08 (最新同步 - 已解决收银金额分配与颜色解析逻辑)*

本文档作为项目逻辑与进度的“记忆库”，旨在减少长对话中的上下文重复。新对话开始时，请直接发送“阅读 MEMO.md”即可。

## 0. 项目部署与环境信息
- **GitHub**: `https://github.com/FX-ESTETICA/fx-.git`
- **Vercel**: `https://fx-rapallo.vercel.app`
- **Supabase**: 
  - URL: `https://otkzntibwinszparrkru.supabase.co`
  - Key: `sb_publishable_zvSB8MZJ4T_Oq51aNlzMEg_gDl1HeBM`

## 1. 核心业务逻辑 (Core Business Logic)

### A. 技师与项目颜色绑定
- **逻辑**: 项目文本颜色必须与操作技师的代表色一致（如 FANG-红, ALEXA-绿）。
- **增强解析**: 系统支持从 `bg-rose-500` (背景) 和 `border-rose-500` (边框) 类名中自动反向识别技师。
- **默认色**: 未分配技师时，项目默认显示为蓝色 (`text-sky-400`)。

### B. 三种操作方案 (Staff-Project Binding)
1. **方案 A (自动顺序匹配 - 默认高优先级)**: 
   - 逻辑：按输入顺序 1:1 匹配选中的技师。
   - 记录：在备注中使用 `[STAFF_SEQ:ID1,ID2]` 记录。
2. **方案 B (点选绑定模式)**: 
   - 逻辑：选项目 -> 点技师 -> 染色绑定。
   - 记录：在备注中使用 `[项目名_STAFF:ID]` 记录。
3. **方案 C (分步交替模式)**: 
   - 逻辑：选技师 -> 选项目 -> 切换技师。

### C. 散客自动编号系统
- **逻辑**: 选择“散客”作为会员时，系统自动重命名为“散客1”、“散客2”等。
- **重置机制**: 编号按天计数，每天零点自动重置回 1。
- **拆分继承**: 预约单拆分时，所有关联的子预约单继承同一个散客编号，确保结账时能合并。

### D. 收银结账汇总 (Billing Merge)
- **合并规则**: 同一天 + 同一个会员 ID（或散客编号）的所有预约单自动合并。
- **金额分配引擎**: 
  - 进入预览时，系统根据项目颜色和备注中的 `STAFF_SEQ` 自动将金额分摊到参与技师名下。
  - 解决了“金额显示为 0”的问题：通过 `useEffect` 监控 `showCheckoutPreview` 状态，确保在渲染前完成数据同步。

## 2. 技术架构与规范
- **框架**: Next.js 14 + Tailwind CSS 4 (JIT)。
- **样式**: 使用 `clsx` + `twMerge` 处理动态类名。由于 Tailwind 4 不支持动态拼接类名，所有颜色映射必须在 `getStaffColorClass` 中显式定义。
- **数据存储**: Supabase。备注字段作为逻辑扩展（存储 `[STAFF_SEQ]` 等元数据）。

## 3. 已知修复与注意事项
- **TS 类型错误**: 已修复 `Calendar.tsx` 中 `null` 不能分配给 `string | undefined` 的问题，确保部署成功。
- **部署锁定**: 修复了构建时由于类型检查失败导致的 Vercel Deployment Failed。
- **零动画响应**: 移除了所有 UI 过渡动画，追求极致的操作速度。

---
*注：新对话开始时，请直接发送“阅读 MEMO.md”即可让助手恢复上述所有记忆。*
