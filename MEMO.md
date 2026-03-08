# 项目部署与逻辑记忆 (MEMO)

## 1. 部署信息
- **Vercel 项目名称**: `fx-rapallo`
- **正式域名**: `fx-rapallo.vercel.app`
- **部署命令**: `vercel --prod`
- **关联仓库**: `FX-ESTETICA/fx-`

## 2. 核心 UI 设计规范
- **风格**: 极致玻璃质感 (Glassmorphism)
- **参数**: `bg-white/[0.03]`, `backdrop-blur-sm`, `border-white/30`, `ring-1 ring-white/10`
- **文字**: 核心标签统一为 **白色、加粗、斜体** (`text-white font-black italic`)
- **遮罩**: 移除背景雾罩层，保持清透感

## 3. 核心业务逻辑
- **分段预约**: 增加会员 ID 冲突检测，确保同一会员的平行预约分派到不同员工列。
- **看板统计**: 
  - 实时连接预约数据。
  - 包含“未结账”预约的预估业绩（通过项目价格表计算）。
  - 会员排行采用 **9+1 模式**：前 9 名为消费最高会员，第 10 名为“散客”汇总，且散客强制垫底不显示编号。

## 4. 环境要求
- **Next.js**: 16.1.6
- **React**: 19
- **Tailwind**: 4.0+
- **Database**: Supabase (需配置 URL 和 ANON_KEY 环境变量)
