# Feature-First Architecture (顶级图书馆架构)

## 核心理念
为了实现“零连锁错误”和“顶级图书馆整洁度”，我们采用 **Feature-First (功能优先)** 目录结构。

## 目录规范
- **src/features/**: 
  - 每个文件夹代表一个独立的功能域（如 `auth`, `calendar`）。
  - 每个功能域内部应包含其私有的 `components/`, `hooks/`, `types/`, `utils/`。
  - **严禁** 功能域之间产生未经允许的深度耦合。
- **src/components/shared/**: 存放跨功能通用的原子级 UI 组件（如 Button, Input, GlassCard）。
- **src/lib/**: 第三方 SDK 初始化的唯一出口（如 Supabase Client, Bunny Config）。

## 开发者守则
1. 当你寻找某个功能逻辑时，直接进入对应的 `features/` 目录。
2. 当你修改某个功能时，不应影响到其他 `features/`。
3. 如果一个组件被超过 3 个 feature 使用，请考虑将其重构至 `components/shared/`。
