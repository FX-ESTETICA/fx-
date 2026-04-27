const fs = require('fs');

function processFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add isLight if not present
    if (!content.includes('useVisualSettings')) {
        content = content.replace('import { useAuth }', 'import { useVisualSettings } from "@/hooks/useVisualSettings";\nimport { useAuth }');
    }
    if (!content.includes('const isLight')) {
        content = content.replace('const { user', 'const { settings } = useVisualSettings();\n  const isLight = settings.frontendBgIndex !== 0;\n  const { user');
    }

    // Safely replace className="... text-white ..." with className={`... ${isLight ? "text-black" : "text-white"} ...`}
    // Only match simple "..." string literals, no nested quotes.
    const regexStr = /className="([^"]*?)"/g;
    content = content.replace(regexStr, (match, p1) => {
        if (!p1.includes('white')) return match; // fast path

        let newClass = p1;
        let hasChanges = false;
        
        const replacements = [
            { from: /\btext-white\/(\d+)\b/g, to: '${isLight ? "text-black/$1" : "text-white/$1"}' },
            { from: /\btext-white\b/g, to: '${isLight ? "text-black" : "text-white"}' },
            { from: /\bbg-white\/(\d+)\b/g, to: '${isLight ? "bg-black/$1" : "bg-white/$1"}' },
            { from: /\bbg-white\b/g, to: '${isLight ? "bg-black" : "bg-white"}' },
            { from: /\bborder-white\/(\d+)\b/g, to: '${isLight ? "border-black/$1" : "border-white/$1"}' },
            { from: /\bborder-white\b/g, to: '${isLight ? "border-black" : "border-white"}' },
            { from: /\bplaceholder:text-white\/(\d+)\b/g, to: '${isLight ? "placeholder:text-black/$1" : "placeholder:text-white/$1"}' },
            { from: /\bhover:text-white\/(\d+)\b/g, to: '${isLight ? "hover:text-black/$1" : "hover:text-white/$1"}' },
            { from: /\bhover:text-white\b/g, to: '${isLight ? "hover:text-black" : "hover:text-white"}' },
            { from: /\bgroup-hover:text-white\b/g, to: '${isLight ? "group-hover:text-black" : "group-hover:text-white"}' },
            { from: /\bhover:bg-white\/(\d+)\b/g, to: '${isLight ? "hover:bg-black/$1" : "hover:bg-white/$1"}' },
        ];

        for (const {from, to} of replacements) {
            if (from.test(newClass)) {
                newClass = newClass.replace(from, to);
                hasChanges = true;
            }
        }

        if (hasChanges) {
            return 'className={`' + newClass + '`}';
        }
        return match;
    });

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
}

processFile('src/features/profile/components/UserDashboard.tsx');
processFile('src/features/profile/components/MerchantDashboard.tsx');
processFile('src/features/profile/components/ProfileHeader.tsx');
