import sys, re

with open('c:/Users/xu/Desktop/GX/src/features/calendar/components/NebulaConfigHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. activeTab wrappers
content = re.sub(r'<AnimatePresence mode="wait">\s*<motion\.div\s*key=\{activeTab\}[\s\S]*?className="space-y-6"\s*>', r'<div key={activeTab} className="space-y-6">', content)
content = re.sub(r'</motion\.div>\s*</AnimatePresence>\s*</div>\s*\{\/\* 底部 Contextual', r'</div>\n        </div>\n\n        {/* 底部 Contextual', content)

# 2. Contextual wrapper
content = re.sub(r'<AnimatePresence>\s*\{editingContext\.type && \(\s*<motion\.div[\s\S]*?className=\{cn\("absolute bottom-0', r'{editingContext.type && (\n          <div className={cn("absolute bottom-0', content)

# 3. Trailing tags
content = re.sub(r'</motion\.div>\s*\)\}\s*</AnimatePresence>\s*</motion\.div>\s*</>\s*\)\}\s*</AnimatePresence>\s*</>\s*\);\s*\};', r'</div>\n        )}\n      </div>\n      </>\n    )}\n  </>\n  );\n};', content)

with open('c:/Users/xu/Desktop/GX/src/features/calendar/components/NebulaConfigHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done!")