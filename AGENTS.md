<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# GX 核心架构与设计法则 (MEMO)

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
