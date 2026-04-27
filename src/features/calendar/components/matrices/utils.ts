export function isActiveBgColor(accent: string) {
  switch (accent) {
    case 'purple': return "";
    case 'cyan': return "";
    case 'gold': return "bg-orange-500/10";
    case 'red': return "bg-red-500/10";
    default: return "bg-white/10";
  }
}

export function isActiveBorderColor(accent: string) {
  switch (accent) {
    case 'purple': return "";
    case 'cyan': return "";
    case 'gold': return "border-orange-500/20";
    case 'red': return "border-red-500/20";
    default: return "border-white/20";
  }
}
