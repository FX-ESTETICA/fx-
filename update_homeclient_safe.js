const fs = require('fs');

function replaceDynamic(content, find, replaceWith) {
  // First, replace inside cn() arguments or other regular strings
  // If it's `"text-gx-cyan"` (exactly), replace with `isLight ? "text-black" : "text-white"` (no quotes around the ternary)
  const exactRegex = new RegExp(`"${find}"`, 'g');
  content = content.replace(exactRegex, replaceWith);

  // If it's inside a template literal: `` `... text-gx-cyan ...` ``
  // We can just replace `text-gx-cyan` with `${isLight ? "text-black" : "text-white"}`
  
  // Actually, let's just do it step by step.
  // 1. Upgrade className="...text-gx-cyan..." to className={`...${isLight ? "text-black" : "text-white"}...`}
  let regex = new RegExp(`className="([^"]*?)${find}([^"]*?)"`, 'g');
  while (regex.test(content)) {
    content = content.replace(regex, `className={\`$1\${${replaceWith}}\$2\`}`);
  }

  // 2. Upgrade other double quoted strings that contain it but are not exact matches:
  // e.g. "group-hover:text-gx-cyan text-sm"
  let stringRegex = new RegExp(`"([^"]*?)${find}([^"]*?)"`, 'g');
  while (stringRegex.test(content)) {
    content = content.replace(stringRegex, `\`$1\${${replaceWith}}\$2\``);
  }

  // 3. For template literals (backticks)
  let tickRegex = new RegExp(`\`([^\`]*?)${find}([^\`]*?)\``, 'g');
  while (tickRegex.test(content)) {
    content = content.replace(tickRegex, `\`$1\${${replaceWith}}\$2\``);
  }

  return content;
}

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Insert imports and state
  if (!content.includes('useVisualSettings')) {
    content = content.replace('import { cn }', 'import { useVisualSettings } from "@/hooks/useVisualSettings";\nimport { cn }');
    content = content.replace('export function HomeClient({ initialRealShops, isActive = true }: { initialRealShops: any[], isActive?: boolean }) {\n  const t = useTranslations("Home");', 
      'export function HomeClient({ initialRealShops, isActive = true }: { initialRealShops: any[], isActive?: boolean }) {\n  const { settings, isLoaded } = useVisualSettings();\n  const isLight = settings.frontendBgIndex !== 0;\n  const t = useTranslations("Home");');
  }

  content = replaceDynamic(content, 'text-gx-cyan', 'isLight ? "text-black" : "text-white"');
  content = replaceDynamic(content, 'border-gx-cyan\/[0-9]+', 'isLight ? "border-black/20" : "border-white/20"');
  content = replaceDynamic(content, 'border-gx-cyan', 'isLight ? "border-black" : "border-white"');
  content = replaceDynamic(content, 'bg-gx-cyan\/[0-9]+', 'isLight ? "bg-black/10" : "bg-white/10"');
  content = replaceDynamic(content, 'bg-gx-cyan', 'isLight ? "bg-black" : "bg-white"');
  content = replaceDynamic(content, 'from-gx-cyan\/[0-9]+', 'isLight ? "from-black/10" : "from-white/10"');
  content = replaceDynamic(content, 'from-gx-cyan', 'isLight ? "from-black" : "from-white"');
  content = replaceDynamic(content, 'via-gx-cyan\/[0-9]+', 'isLight ? "via-black/10" : "via-white/10"');
  content = replaceDynamic(content, 'via-gx-cyan', 'isLight ? "via-black" : "via-white"');
  content = replaceDynamic(content, 'to-gx-cyan\/[0-9]+', 'isLight ? "to-black/10" : "to-white/10"');
  content = replaceDynamic(content, 'to-gx-cyan', 'isLight ? "to-black" : "to-white"');

  // Remove shadows
  content = content.replace(/drop-shadow-\[0_0_[0-9]+px_rgba\([0-9,.]+\)\]/g, '');
  content = content.replace(/shadow-\[0_0_[0-9]+px_[#A-Fa-f0-9]+\]/g, '');
  content = content.replace(/shadow-\[0_0_[0-9]+px_rgba\([0-9,.]+\)\]/g, '');

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

processFile('c:/Users/xu/Desktop/GX/src/app/home/HomeClient.tsx');
