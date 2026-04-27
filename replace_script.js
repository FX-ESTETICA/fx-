const fs = require('fs');
const file = 'src/features/calendar/components/AiFinanceDashboardModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix the theme detection logic
content = content.replace(
  /const isLight = settings\.theme === 'light';/g,
  "const isLight = settings.headerTitleColorTheme === 'coreblack';"
);

// 2. Fix the main window background (remove backdrop-blur-xl and border)
content = content.replace(
  /className=\{cn\(\s*"relative z-10 w-full max-w-6xl h-\[85vh\] rounded-2xl flex flex-col overflow-hidden backdrop-blur-xl border",\s*isLight\s*\?\s*"bg-white\/50 border-white\/20 shadow-\[0_0_50px_rgba\(0,0,0,0\.1\)\]"\s*:\s*"bg-black\/50 border-white\/10 shadow-\[0_0_50px_rgba\(0,0,0,1\)\]"\s*\)\}/,
  `className={cn(
            "relative z-10 w-full max-w-6xl h-[85vh] rounded-2xl flex flex-col overflow-hidden",
            isLight 
              ? "bg-white/50 shadow-[0_0_50px_rgba(0,0,0,0.1)]" 
              : "bg-black/50 shadow-[0_0_50px_rgba(0,0,0,1)]"
          )}`
);

// 3. Systematically replace colors:
// We need to convert strings like: "w-full bg-white/5 border border-white/5 rounded-xl"
// into cn(isLight ? "..." : "...") dynamically.

// Let's manually write a function that replaces classes:
function replaceClass(cls) {
  // if it's text-white, replace with text-black
  if (cls === 'text-white') return 'text-black';
  if (cls === 'text-black') return 'text-white';
  
  if (cls.startsWith('text-white/')) return cls.replace('text-white/', 'text-black/');
  if (cls.startsWith('text-black/')) return cls.replace('text-black/', 'text-white/');
  
  if (cls.startsWith('bg-white/')) return cls.replace('bg-white/', 'bg-black/');
  if (cls.startsWith('bg-black/')) return cls.replace('bg-black/', 'bg-white/');
  
  if (cls.startsWith('border-white/')) return cls.replace('border-white/', 'border-black/');
  if (cls.startsWith('border-black/')) return cls.replace('border-black/', 'border-white/');

  if (cls === 'bg-[#0f0f0f]') return 'bg-white/50'; // light mode for these cards
  
  return cls;
}

// First, find all className="..." and convert them to className={cn(isLight ? "..." : "...")} if they contain white/black classes
content = content.replace(/className="([^"]*?(text-white|bg-white|border-white|text-black|bg-black|border-black|bg-\[#0f0f0f\])[^"]*?)"/g, (match, classesStr) => {
  const darkClasses = classesStr;
  const lightClasses = classesStr.split(' ').map(replaceClass).join(' ');
  return `className={cn(isLight ? "${lightClasses}" : "${darkClasses}")}`;
});

// Second, there are existing cn() calls that might have strings with white/black classes that aren't already isLight ternaries.
// For example: cn("flex items-center ... text-white/50", isPositive ? ... )
// Actually, the easiest is to just find all string literals inside cn() that contain these classes and aren't part of a ternary
// We can use a simpler approach: manually review if we missed anything.

fs.writeFileSync(file, content, 'utf8');
console.log("Replacement done!");
