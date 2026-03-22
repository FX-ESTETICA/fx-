export function isActiveBgColor(accent: string) {
  switch (accent) {
    case 'purple': return "bg-gx-purple/10";
    case 'cyan': return "bg-gx-cyan/10";
    case 'gold': return "bg-orange-500/10";
    case 'red': return "bg-red-500/10";
    default: return "bg-white/10";
  }
}

export function isActiveBorderColor(accent: string) {
  switch (accent) {
    case 'purple': return "border-gx-purple/20";
    case 'cyan': return "border-gx-cyan/20";
    case 'gold': return "border-orange-500/20";
    case 'red': return "border-red-500/20";
    default: return "border-white/20";
  }
}
