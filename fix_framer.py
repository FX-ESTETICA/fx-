import re

file_path = 'c:/Users/xu/Desktop/GX/src/features/calendar/components/NebulaConfigHub.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove all <AnimatePresence> and </AnimatePresence>
content = re.sub(r'<\/?AnimatePresence[^>]*>\n?', '', content)

# Replace <motion.div with <div
content = re.sub(r'<motion\.div', '<div', content)
content = re.sub(r'</motion\.div>', '</div>', content)

# Remove framer-motion specific props like initial={...}, animate={...}, exit={...}, layout, layoutId
content = re.sub(r'\s+(initial|animate|exit|transition)=\{\{.*?\}\}', '', content)
content = re.sub(r'\s+(initial|animate|exit|transition)=".*?"', '', content)
content = re.sub(r'\s+layout(Id=".*?")?', '', content)
content = re.sub(r'\s+layout\b', '', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done stripping all framer motion from NebulaConfigHub")