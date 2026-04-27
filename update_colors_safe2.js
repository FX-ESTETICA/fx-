const fs = require('fs');

function processFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // 1. Add imports if needed
    if (!content.includes('useVisualSettings')) {
        content = content.replace(
            'import { useAuth }', 
            'import { useVisualSettings } from "@/hooks/useVisualSettings";\nimport { useAuth }'
        );
    }

    // 2. Add isLight logic if not present
    if (!content.includes('const isLight')) {
        // Find where `useAuth` is called to insert `useVisualSettings`
        content = content.replace(
            /const { user(.*?) } = useAuth\(\);/,
            'const { settings } = useVisualSettings();\n  const isLight = settings.frontendBgIndex !== 0;\n  const { user$1 } = useAuth();'
        );
        // Also fallback for MerchantDashboard where useAuth might not be there
        if (!content.includes('const isLight')) {
            content = content.replace(
                /const t = useTranslations\([^)]+\);/,
                '$&\n  const { settings } = useVisualSettings();\n  const isLight = settings.frontendBgIndex !== 0;'
            );
        }
    }

    // 3. Replace simple string classes safely
    // Match `className="something"`
    content = content.replace(/className="([^"]+)"/g, (match, cls) => {
        if (!cls.includes('white') && !cls.includes('black')) return match;
        
        let newCls = cls;
        
        // Use a simpler string replacement for static classes
        const map = {
            'text-white': '${isLight ? "text-black" : "text-white"}',
            'text-white/10': '${isLight ? "text-black/10" : "text-white/10"}',
            'text-white/20': '${isLight ? "text-black/20" : "text-white/20"}',
            'text-white/30': '${isLight ? "text-black/30" : "text-white/30"}',
            'text-white/40': '${isLight ? "text-black/40" : "text-white/40"}',
            'text-white/50': '${isLight ? "text-black/50" : "text-white/50"}',
            'text-white/60': '${isLight ? "text-black/60" : "text-white/60"}',
            'text-white/70': '${isLight ? "text-black/70" : "text-white/70"}',
            'text-white/80': '${isLight ? "text-black/80" : "text-white/80"}',
            'text-white/90': '${isLight ? "text-black/90" : "text-white/90"}',
            'bg-white': '${isLight ? "bg-black" : "bg-white"}',
            'bg-white/5': '${isLight ? "bg-black/5" : "bg-white/5"}',
            'bg-white/10': '${isLight ? "bg-black/10" : "bg-white/10"}',
            'bg-white/20': '${isLight ? "bg-black/20" : "bg-white/20"}',
            'bg-white/40': '${isLight ? "bg-black/40" : "bg-white/40"}',
            'bg-white/80': '${isLight ? "bg-black/80" : "bg-white/80"}',
            'border-white/5': '${isLight ? "border-black/5" : "border-white/5"}',
            'border-white/10': '${isLight ? "border-black/10" : "border-white/10"}',
            'border-white/20': '${isLight ? "border-black/20" : "border-white/20"}',
            'hover:text-white': '${isLight ? "hover:text-black" : "hover:text-white"}',
            'hover:text-white/80': '${isLight ? "hover:text-black/80" : "hover:text-white/80"}',
            'hover:bg-white/10': '${isLight ? "hover:bg-black/10" : "hover:bg-white/10"}',
            'hover:bg-white/20': '${isLight ? "hover:bg-black/20" : "hover:bg-white/20"}',
            'placeholder:text-white/20': '${isLight ? "placeholder:text-black/20" : "placeholder:text-white/20"}',
            'placeholder:text-white/40': '${isLight ? "placeholder:text-black/40" : "placeholder:text-white/40"}'
        };

        let changed = false;
        let parts = newCls.split(' ');
        for (let i = 0; i < parts.length; i++) {
            if (map[parts[i]]) {
                parts[i] = map[parts[i]];
                changed = true;
            }
        }
        
        if (changed) {
            return `className={\`${parts.join(' ')}\`}`;
        }
        return match;
    });

    // 4. Replace within cn(...)
    // Match cn(..., "something text-white", ...)
    content = content.replace(/cn\(([\s\S]*?)\)/g, (match, inner) => {
        if (!inner.includes('white') && !inner.includes('black')) return match;
        
        // We only want to replace string literals inside cn()
        let newInner = inner.replace(/"([^"]+)"/g, (strMatch, cls) => {
            const map = {
                'text-white': 'isLight ? "text-black" : "text-white"',
                'text-white/10': 'isLight ? "text-black/10" : "text-white/10"',
                'text-white/20': 'isLight ? "text-black/20" : "text-white/20"',
                'text-white/30': 'isLight ? "text-black/30" : "text-white/30"',
                'text-white/40': 'isLight ? "text-black/40" : "text-white/40"',
                'text-white/50': 'isLight ? "text-black/50" : "text-white/50"',
                'text-white/60': 'isLight ? "text-black/60" : "text-white/60"',
                'text-white/70': 'isLight ? "text-black/70" : "text-white/70"',
                'text-white/80': 'isLight ? "text-black/80" : "text-white/80"',
                'text-white/90': 'isLight ? "text-black/90" : "text-white/90"',
                'bg-white': 'isLight ? "bg-black" : "bg-white"',
                'bg-white/5': 'isLight ? "bg-black/5" : "bg-white/5"',
                'bg-white/10': 'isLight ? "bg-black/10" : "bg-white/10"',
                'bg-white/20': 'isLight ? "bg-black/20" : "bg-white/20"',
                'bg-white/40': 'isLight ? "bg-black/40" : "bg-white/40"',
                'bg-white/80': 'isLight ? "bg-black/80" : "bg-white/80"',
                'border-white/5': 'isLight ? "border-black/5" : "border-white/5"',
                'border-white/10': 'isLight ? "border-black/10" : "border-white/10"',
                'border-white/20': 'isLight ? "border-black/20" : "border-white/20"',
                'hover:text-white': 'isLight ? "hover:text-black" : "hover:text-white"',
                'hover:text-white/80': 'isLight ? "hover:text-black/80" : "hover:text-white/80"',
                'hover:bg-white/10': 'isLight ? "hover:bg-black/10" : "hover:bg-white/10"',
                'hover:bg-white/20': 'isLight ? "hover:bg-black/20" : "hover:bg-white/20"',
                'placeholder:text-white/20': 'isLight ? "placeholder:text-black/20" : "placeholder:text-white/20"',
                'placeholder:text-white/40': 'isLight ? "placeholder:text-black/40" : "placeholder:text-white/40"'
            };

            let parts = cls.split(' ');
            let dynamicParts = [];
            let staticParts = [];
            
            for (let p of parts) {
                if (map[p]) {
                    dynamicParts.push(map[p]);
                } else {
                    staticParts.push(p);
                }
            }
            
            if (dynamicParts.length > 0) {
                let res = '';
                if (staticParts.length > 0) {
                    res += `"${staticParts.join(' ')}", `;
                }
                res += dynamicParts.join(', ');
                return res;
            }
            
            return strMatch;
        });
        
        return `cn(${newInner})`;
    });

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
}

processFile('src/features/profile/components/UserDashboard.tsx');
processFile('src/features/profile/components/MerchantDashboard.tsx');
processFile('src/features/profile/components/ProfileHeader.tsx');
