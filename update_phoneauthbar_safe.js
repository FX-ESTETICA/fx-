const fs = require('fs');

const filePath = 'c:/Users/xu/Desktop/GX/src/features/profile/components/PhoneAuthBar.tsx';

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Insert useVisualSettings if not present
  if (!content.includes('useVisualSettings')) {
    content = content.replace('import { useAuth } from "@/features/auth/hooks/useAuth";', 'import { useAuth } from "@/features/auth/hooks/useAuth";\nimport { useVisualSettings } from "@/hooks/useVisualSettings";');
  }

  if (!content.includes('const isLight')) {
    content = content.replace("const t = useTranslations('PhoneAuthBar');", "const t = useTranslations('PhoneAuthBar');\n  const { settings, isLoaded } = useVisualSettings();\n  const isLight = isLoaded && settings.frontendBgIndex !== 0;");
  }

  const replacements = [
    { old: /"w-px h-4 bg-white\/10"/g, newStr: "cn(\"w-px h-4\", isLight ? \"bg-black/10\" : \"bg-white/10\")" },
    { old: /"text-\[10px\] font-bold tracking-widest text-white\/50"/g, newStr: "cn(\"text-[10px] font-bold tracking-widest\", isLight ? \"text-black/50\" : \"text-white/50\")" },
    { old: /"text-\[11px\] font-mono tracking-\[0\.1em\] text-white\/90 w-\[115px\] text-center transition-all duration-300"/g, newStr: "cn(\"text-[11px] font-mono tracking-[0.1em] w-[115px] text-center transition-all duration-300\", isLight ? \"text-black/90\" : \"text-white/90\")" },
    { old: /"w-3 h-3 text-white\/40 group-hover:text-gx-cyan transition-colors"/g, newStr: "cn(\"w-3 h-3 transition-colors\", isLight ? \"text-black/40 group-hover:text-black\" : \"text-white/40 group-hover:text-white\")" },
    { old: /"w-3 h-3 text-white\/20 group-hover:text-gx-cyan transition-colors"/g, newStr: "cn(\"w-3 h-3 transition-colors\", isLight ? \"text-black/20 group-hover:text-black\" : \"text-white/20 group-hover:text-white\")" },
    { old: /"flex items-center justify-center px-5 py-2 text-\[10px\] font-bold tracking-widest text-white\/30 hover:text-red-500\/80 transition-colors group"/g, newStr: "cn(\"flex items-center justify-center px-5 py-2 text-[10px] font-bold tracking-widest transition-colors group\", isLight ? \"text-black/30 hover:text-red-600/80\" : \"text-white/30 hover:text-red-500/80\")" },
    { old: /text-gx-cyan/g, newStr: "${isLight ? 'text-black' : 'text-white'}" },
    { old: /bg-gx-cyan\/10/g, newStr: "${isLight ? 'bg-black/10' : 'bg-white/10'}" },
    { old: /bg-gx-cyan\/5/g, newStr: "${isLight ? 'bg-black/5' : 'bg-white/5'}" },
    { old: /group-focus-within:text-gx-cyan/g, newStr: "group-focus-within:${isLight ? 'text-black' : 'text-white'}" },
    { old: /group-focus-within:bg-gx-cyan\/5/g, newStr: "group-focus-within:${isLight ? 'bg-black/5' : 'bg-white/5'}" },
    { old: /border-gx-cyan/g, newStr: "${isLight ? 'border-black/50' : 'border-white/50'}" },
    { old: /focus-within:border-gx-cyan/g, newStr: "focus-within:${isLight ? 'border-black/50' : 'border-white/50'}" },
    { old: /shadow-\[0_0_15px_rgba\(0,240,255,0\.2\)\]/g, newStr: "" },
    { old: /bg-black\/20/g, newStr: "${isLight ? 'bg-black/5' : 'bg-black/20'}" },
    { old: /border-white\/10/g, newStr: "${isLight ? 'border-black/10' : 'border-white/10'}" },
    { old: /text-white\/40/g, newStr: "${isLight ? 'text-black/40' : 'text-white/40'}" },
    { old: /text-white\/20/g, newStr: "${isLight ? 'text-black/20' : 'text-white/20'}" },
    { old: /bg-white\/5/g, newStr: "${isLight ? 'bg-black/5' : 'bg-white/5'}" },
    { old: /hover:bg-white\/5/g, newStr: "hover:${isLight ? 'bg-black/5' : 'bg-white/5'}" },
    { old: /border-white\/5/g, newStr: "${isLight ? 'border-black/5' : 'border-white/5'}" },
  ];

  replacements.forEach(r => {
    content = content.replace(r.old, r.newStr);
  });

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}