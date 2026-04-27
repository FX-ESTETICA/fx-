const fs = require('fs');
const path = 'c:/Users/xu/Desktop/GX/src/features/booking/components/DualPaneBookingModal.tsx';

let content = fs.readFileSync(path, 'utf8');

// 1. Remove shadows (glows)
content = content.replace(/\s*shadow-\[0_0_[^\]]+rgba\((?:0,240,255|0,255,255|57,255,20)[^\]]+\)\]/g, '');
content = content.replace(/\s*drop-shadow-\[0_0_[^\]]+rgba\((?:0,240,255|0,255,255|57,255,20)[^\]]+\)\]/g, '');
content = content.replace(/shadow-\[0_10px_30px_rgba\(0,0,0,0\.8\),0_0_15px_rgba\(0,240,255,0\.1\)\]/g, 'shadow-[0_10px_30px_rgba(0,0,0,0.8)]');

// 2. We need to replace gx-cyan with whitegold/blackgold based on isLight
// To do this, we can replace the tailwind classes directly.
// The user has defined:
// blackgold for light theme: #8B7355
// whitegold for dark theme: #FDF5E6
// Instead of `#8B7355`, we'll use `gx-blackgold` and `gx-whitegold` if we can, but since they aren't in tailwind config, we use arbitrary values `[#8B7355]` and `[#FDF5E6]`.
// So "text-gx-cyan" becomes `isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"`.
// "border-gx-cyan" becomes `isLight ? "border-[#8B7355]" : "border-[#FDF5E6]"` etc.
// But some are already inside `cn()` or ternary operators.
// Since `isLight` is defined in the component, we can use it.
// Actually, it's easier to create a helper or just replace them carefully.

function replaceDynamic(match, prefix, suffix = '') {
  return `\${isLight ? "${prefix}-[#8B7355]${suffix}" : "${prefix}-[#FDF5E6]${suffix}"}`;
}

// Regex for tailwind classes with gx-cyan inside string literals.
// For strings like "text-gx-cyan", we want to change it to `${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"}`
// BUT this only works if the string is a template literal `...` or we can change it to one.
// Since the file is TSX and already uses `cn("...", ...)` extensively, we can just replace the string literal with a ternary expression if it's inside cn(), or convert to template literal.

// Let's do it manually for specific patterns to be safe:

const patterns = [
  // 1. "border-gx-cyan" -> isLight ? "border-[#8B7355]" : "border-[#FDF5E6]"
  { from: /"border-gx-cyan"/g, to: 'isLight ? "border-[#8B7355]" : "border-[#FDF5E6]"' },
  { from: /"border-gx-cyan\/30"/g, to: 'isLight ? "border-[#8B7355]/30" : "border-[#FDF5E6]/30"' },
  { from: /"border-gx-cyan\/50"/g, to: 'isLight ? "border-[#8B7355]/50" : "border-[#FDF5E6]/50"' },
  { from: /"border-gx-cyan\/60"/g, to: 'isLight ? "border-[#8B7355]/60" : "border-[#FDF5E6]/60"' },
  { from: /hover:border-gx-cyan\/70/g, to: 'hover:border-[#8B7355]/70" : "hover:border-[#FDF5E6]/70' }, // wait, this is tricky if inside a bigger string

  // Actually, a safer way is to replace `text-gx-cyan` with `${isLight ? 'text-[#8B7355]' : 'text-[#FDF5E6]'}` and wrap the string in backticks if it was double quotes.
  // Or better, just add a constant at the top of the render function:
  // `const themeColor = isLight ? "#8B7355" : "#FDF5E6";`
  // But tailwind doesn't support dynamic colors like `text-[${themeColor}]`. We must use full class names.
];

// Let's just do targeted replacements for the ones found in the grep.
content = content.replace(/"text-gx-cyan"/g, 'isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"');
content = content.replace(/"text-gx-cyan\/40"/g, 'isLight ? "text-[#8B7355]/40" : "text-[#FDF5E6]/40"');
content = content.replace(/"text-gx-cyan\/70"/g, 'isLight ? "text-[#8B7355]/70" : "text-[#FDF5E6]/70"');

content = content.replace(/"bg-gx-cyan"/g, 'isLight ? "bg-[#8B7355]" : "bg-[#FDF5E6]"');
content = content.replace(/"bg-gx-cyan\/10"/g, 'isLight ? "bg-[#8B7355]/10" : "bg-[#FDF5E6]/10"');
content = content.replace(/"bg-gx-cyan\/20"/g, 'isLight ? "bg-[#8B7355]/20" : "bg-[#FDF5E6]/20"');
content = content.replace(/"bg-gx-cyan\/5"/g, 'isLight ? "bg-[#8B7355]/5" : "bg-[#FDF5E6]/5"');

content = content.replace(/via-gx-cyan\/30/g, 'via-[#8B7355]/30'); // if inside string, we might just hardcode one? Wait, if we replace "via-gx-cyan", we need to split strings.
// Let's replace `gx-cyan` with `[#8B7355]` for isLight and `[#FDF5E6]` for dark.
// Wait, we can't just do that. Let's look at how cn() handles it.

// Let's use regex to find all strings containing gx-cyan and convert them to use isLight ternary.
content = content.replace(/"([^"]*?)gx-cyan([^"]*?)"/g, (match, p1, p2) => {
  // If the string is just "text-gx-cyan", it becomes `isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"`
  // If it's "w-1 h-1 bg-gx-cyan rounded-full animate-ping", we can do:
  // `cn("w-1 h-1 rounded-full animate-ping", isLight ? "bg-[#8B7355]" : "bg-[#FDF5E6]")`
  // But we are inside JSX. 
  // Let's just replace `gx-cyan` inside the string with `${isLight ? '[#8B7355]' : '[#FDF5E6]'}` and convert `"` to `\``
  return '`' + p1 + '${isLight ? "[#8B7355]" : "[#FDF5E6]"}' + p2 + '`';
});

// We also need to handle cases where it's already in a template literal `...`
content = content.replace(/`([^`]*?)gx-cyan([^`]*?)`/g, (match, p1, p2) => {
  if (p1.includes('${isLight ? "[#8B7355]" : "[#FDF5E6]"}')) return match; // already replaced
  return '`' + p1 + '${isLight ? "[#8B7355]" : "[#FDF5E6]"}' + p2 + '`';
});

// Same for `0,240,255` in rgba
content = content.replace(/rgba\(0,240,255,([^)]+)\)/g, (match, p1) => {
  // #8B7355 is 139,115,85
  // #FDF5E6 is 253,245,230
  return '${isLight ? `rgba(139,115,85,' + p1 + ')` : `rgba(253,245,230,' + p1 + ')`}';
});

// Same for `0,255,255`
content = content.replace(/rgba\(0,255,255,([^)]+)\)/g, (match, p1) => {
  return '${isLight ? `rgba(139,115,85,' + p1 + ')` : `rgba(253,245,230,' + p1 + ')`}';
});

// Wait, the shadow glows were already removed in step 1, so the above rgba replace is only for remaining ones like glowing lines if any.

// Let's write it back
fs.writeFileSync(path, content, 'utf8');
console.log('Done');
