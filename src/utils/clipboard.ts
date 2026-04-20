export const safeCopyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  // 方案 A: 尝试使用现代 Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("Modern clipboard API failed, falling back to legacy.", err);
    }
  }

  // 方案 B: 传统 execCommand 降级方案 (兼容非 HTTPS 协议、WebView 沙盒、或者没有权限的情况)
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // 将 textarea 移出视口，防止出现滚动条闪烁
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    
    document.body.appendChild(textArea);
    
    // 兼容 iOS
    if (navigator.userAgent.match(/ipad|iphone/i)) {
      const range = document.createRange();
      range.selectNodeContents(textArea);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      textArea.setSelectionRange(0, 999999);
    } else {
      textArea.select();
    }

    const successful = document.execCommand("copy");
    textArea.remove();
    
    return successful;
  } catch (err) {
    console.error("Legacy clipboard fallback failed:", err);
    return false;
  }
};
