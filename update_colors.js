const fs = require('fs');

function processFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // First, let's make sure the component has `isLight` defined
    if (!content.includes('const isLight')) {
        console.log(`Skipping ${file} - no isLight defined`);
        return;
    }

    const replaceMap = [
        { regex: /className="([^"]*)\b(text-white\/(\d+))\b([^"]*)"/g, repl: 'className={cn("$1$4", isLight ? "text-black/$3" : "text-white/$3")}' },
        { regex: /className="([^"]*)\b(text-white)\b([^"]*)"/g, repl: 'className={cn("$1$3", isLight ? "text-black" : "text-white")}' },
        
        { regex: /className="([^"]*)\b(bg-white\/(\d+))\b([^"]*)"/g, repl: 'className={cn("$1$4", isLight ? "bg-black/$3" : "bg-white/$3")}' },
        { regex: /className="([^"]*)\b(bg-white)\b([^"]*)"/g, repl: 'className={cn("$1$3", isLight ? "bg-black" : "bg-white")}' },
        
        { regex: /className="([^"]*)\b(border-white\/(\d+))\b([^"]*)"/g, repl: 'className={cn("$1$4", isLight ? "border-black/$3" : "border-white/$3")}' },
        { regex: /className="([^"]*)\b(border-white)\b([^"]*)"/g, repl: 'className={cn("$1$3", isLight ? "border-black" : "border-white")}' },
        
        { regex: /className="([^"]*)\b(placeholder:text-white\/(\d+))\b([^"]*)"/g, repl: 'className={cn("$1$4", isLight ? "placeholder:text-black/$3" : "placeholder:text-white/$3")}' },
        { regex: /className="([^"]*)\b(hover:bg-white\/(\d+))\b([^"]*)"/g, repl: 'className={cn("$1$4", isLight ? "hover:bg-black/$3" : "hover:bg-white/$3")}' },
        { regex: /className="([^"]*)\b(hover:text-white\/(\d+))\b([^"]*)"/g, repl: 'className={cn("$1$4", isLight ? "hover:text-black/$3" : "hover:text-white/$3")}' },
        { regex: /className="([^"]*)\b(hover:text-white)\b([^"]*)"/g, repl: 'className={cn("$1$4", isLight ? "hover:text-black" : "hover:text-white")}' },
        { regex: /className="([^"]*)\b(group-hover:text-white)\b([^"]*)"/g, repl: 'className={cn("$1$4", isLight ? "group-hover:text-black" : "group-hover:text-white")}' },
    ];

    // Inside cn("...", ...)
    const cnReplaceMap = [
        { regex: /cn\(([^)]*?)"([^"]*)\b(text-white\/(\d+))\b([^"]*)"([^)]*?)\)/g, repl: 'cn($1"$2$5", isLight ? "text-black/$4" : "text-white/$4"$6)' },
        { regex: /cn\(([^)]*?)"([^"]*)\b(text-white)\b([^"]*)"([^)]*?)\)/g, repl: 'cn($1"$2$4", isLight ? "text-black" : "text-white"$5)' },
        
        { regex: /cn\(([^)]*?)"([^"]*)\b(bg-white\/(\d+))\b([^"]*)"([^)]*?)\)/g, repl: 'cn($1"$2$5", isLight ? "bg-black/$4" : "bg-white/$4"$6)' },
        { regex: /cn\(([^)]*?)"([^"]*)\b(bg-white)\b([^"]*)"([^)]*?)\)/g, repl: 'cn($1"$2$4", isLight ? "bg-black" : "bg-white"$5)' },
        
        { regex: /cn\(([^)]*?)"([^"]*)\b(border-white\/(\d+))\b([^"]*)"([^)]*?)\)/g, repl: 'cn($1"$2$5", isLight ? "border-black/$4" : "border-white/$4"$6)' },
        { regex: /cn\(([^)]*?)"([^"]*)\b(border-white)\b([^"]*)"([^)]*?)\)/g, repl: 'cn($1"$2$4", isLight ? "border-black" : "border-white"$5)' },
        
        { regex: /cn\(([^)]*?)"([^"]*)\b(hover:text-white)\b([^"]*)"([^)]*?)\)/g, repl: 'cn($1"$2$4", isLight ? "hover:text-black" : "hover:text-white"$5)' },
        { regex: /cn\(([^)]*?)"([^"]*)\b(hover:bg-white\/(\d+))\b([^"]*)"([^)]*?)\)/g, repl: 'cn($1"$2$5", isLight ? "hover:bg-black/$4" : "hover:bg-white/$4"$6)' },
    ];

    for (let pass = 0; pass < 3; pass++) {
        for (const { regex, repl } of replaceMap) {
            content = content.replace(regex, repl);
        }
        for (const { regex, repl } of cnReplaceMap) {
            content = content.replace(regex, repl);
        }
    }

    // Fix some syntax issues that might arise like `cn("", ...)` or extra spaces
    content = content.replace(/cn\(\s*""\s*,\s*/g, 'cn(');
    content = content.replace(/cn\(\s*" "\s*,\s*/g, 'cn(');

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
}

processFile('src/features/profile/components/UserDashboard.tsx');
processFile('src/features/profile/components/MerchantDashboard.tsx');
processFile('src/features/profile/components/ProfileHeader.tsx');
