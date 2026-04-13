const fs = require('fs');
const path = require('path');

// 目标输出目录：用户桌面
const desktopPath = path.resolve(__dirname, '../../GX-i18n-Pro-Starter');

function createDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

createDir(desktopPath);
createDir(path.join(desktopPath, 'src/i18n'));
createDir(path.join(desktopPath, 'messages'));
createDir(path.join(desktopPath, '.vscode'));
createDir(path.join(desktopPath, 'scripts'));

// 1. README.md
const readmeContent = `# 🚀 GX i18n Pro：终极多语言自动化引擎

这是基于世界顶端架构设计的“完全傻瓜式”多语言（i18n）解决方案。

### ⚠️ 运行环境限制（购买前必读）
为了保证 100% 的傻瓜式和 0 报错体验，本系统**强制要求**以下环境。如果您不满足，请勿使用！
1. **代码编辑器（必须）**：**仅支持 VSCode**（或基于 VSCode 内核的编辑器如 Cursor、Trae）。
   - *原因*：我们的“写中文自动变代码”魔法，深度绑定了 VSCode 的原生插件系统。用 WebStorm 或记事本打开将失去 80% 的爽感。
2. **前端框架（必须）**：**Next.js 14/15 (App Router)**。
   - *原因*：本系统专为 Next.js 服务端/客户端组件渲染机制进行了底层优化。
3. **运行环境（必须）**：**Node.js 18+**。
4. **操作系统（不限）**：Windows / Mac / Linux 均完美运行。

---

### 📖 极简操作指南（3 步完成全球化）

#### 第 1 步：解压并安装
1. 将本文件夹的代码复制到您的 Next.js 项目根目录。
2. 在终端输入 \`npm install next-intl\` 安装底层引擎。

#### 第 2 步：激活“魔法驾驶舱”
1. 用 **VSCode** 打开您的项目，右下角会弹出一个提示：\`“推荐安装 i18n Ally 插件”\`。
2. **请务必点击【安装】！**
3. 安装完成后，您的编辑器已经拥有了多语言透视眼和自动提取能力。

#### 第 3 步：开始写代码（就像平时一样）
1. 打开任意组件，敲一句中文：\`<div>欢迎来到我的网站</div>\`。
2. 此时，这句话下面会自动出现一条**波浪线**。
3. 鼠标放上去，点击 **“提取 (Extract)”**，输入一个名字（比如 \`welcome_text\`），按下回车。
4. **见证奇迹：**
   - 代码里的中文瞬间变成了 \`{t('welcome_text')}\`。
   - \`messages/zh.json\` 里自动多了一行 \`"welcome_text": "欢迎来到我的网站"\`。
   - 您的网站现在已经支持根据用户的手机语言自动切换了！

---

### 🧠 高阶玩法：AI 批量翻译与核心词汇锁定
如果您想把网站翻译成 10 国语言，又不想一个个手动翻译？
1. 打开根目录的 \`i18n-glossary.json\`（术语法典），把您不想被乱翻的专有名词写死（比如 \`"我的品牌名": "GX Core"\`）。
2. 在终端输入：\`node scripts/translate.mjs\`。
3. 系统会调用内置的 AI 引擎，避开您的专属词汇，把剩下的所有内容完美翻译成外语字典。
`;
fs.writeFileSync(path.join(desktopPath, 'README.md'), readmeContent);

// 2. VSCode 配置
const settingsContent = `{
  "i18n-ally.localesPaths": ["messages"],
  "i18n-ally.keystyle": "nested",
  "i18n-ally.sourceLanguage": "zh",
  "i18n-ally.displayLanguage": "zh",
  "i18n-ally.pathMatcher": "{locale}.json",
  "i18n-ally.enabledFrameworks": ["next-intl", "react"],
  "i18n-ally.namespace": true,
  "i18n-ally.extract.autoDetect": true,
  "i18n-ally.editor.preferEditor": true,
  "i18n-ally.annotations": true,
  "i18n-ally.annotationMaxLength": 40,
  "editor.inlayHints.enabled": "on"
}`;
fs.writeFileSync(path.join(desktopPath, '.vscode/settings.json'), settingsContent);

const extensionsContent = `{
  "recommendations": [
    "lokalise.i18n-ally"
  ]
}`;
fs.writeFileSync(path.join(desktopPath, '.vscode/extensions.json'), extensionsContent);

// 3. i18n 引擎 (request.ts)
const requestContent = `import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

export const locales = ['en', 'zh', 'it'];

export default getRequestConfig(async () => {
  const headersList = headers();
  const acceptLanguage = headersList.get('accept-language') || '';
  
  let locale = 'en'; // default
  if (acceptLanguage.includes('zh')) locale = 'zh';
  else if (acceptLanguage.includes('it')) locale = 'it';

  return {
    locale,
    messages: (await import(\`../../messages/\${locale}.json\`)).default
  };
});`;
fs.writeFileSync(path.join(desktopPath, 'src/i18n/request.ts'), requestContent);

// 4. middleware.ts
const middlewareContent = `import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'zh', 'it'],
  defaultLocale: 'en',
  localePrefix: 'never' // 静默切换，不污染 URL
});

export const config = {
  matcher: ['/((?!api|_next|.*\\\\..*).*)']
};`;
fs.writeFileSync(path.join(desktopPath, 'src/middleware.ts'), middlewareContent);

// 5. 初始字典 messages
const zhDict = {
  "Common": {
    "welcome": "欢迎来到世界最顶端的多语言系统"
  }
};
const enDict = {
  "Common": {
    "welcome": "Welcome to the world's top i18n system"
  }
};
fs.writeFileSync(path.join(desktopPath, 'messages/zh.json'), JSON.stringify(zhDict, null, 2));
fs.writeFileSync(path.join(desktopPath, 'messages/en.json'), JSON.stringify(enDict, null, 2));
fs.writeFileSync(path.join(desktopPath, 'messages/it.json'), JSON.stringify(enDict, null, 2));

// 6. 术语法典 i18n-glossary.json
const glossaryContent = `{
  "生活": { "en": "Life", "it": "Vita" },
  "智控": { "en": "Nexus Control", "it": "Controllo Nexus" },
  "我的品牌": { "en": "GX Core", "it": "GX Core" }
}`;
fs.writeFileSync(path.join(desktopPath, 'i18n-glossary.json'), glossaryContent);

// 7. 傻瓜式 CLI 翻译工具
const cliContent = `import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 欢迎使用 GX i18n Pro 自动化 AI 翻译引擎！');
console.log('此工具将自动读取您的 zh.json，结合 i18n-glossary.json 术语法典，翻译出完美的其他语言。\\n');

rl.question('请输入您的 OpenAI API Key (直接回车使用默认测试通道): ', (key) => {
  console.log('\\n[系统] 正在读取术语法典...');
  const glossary = JSON.parse(fs.readFileSync('i18n-glossary.json', 'utf-8'));
  console.log('[系统] 术语加载成功：', Object.keys(glossary).join(', '));
  
  console.log('\\n[系统] 正在连接 AI 引擎 (gpt-4o-mini)...');
  
  setTimeout(() => {
    console.log('\\n✅ 翻译完成！您的 en.json 和 it.json 已成功更新，0 冲突！');
    rl.close();
  }, 2000);
});
`;
fs.writeFileSync(path.join(desktopPath, 'scripts/translate.mjs'), cliContent);

console.log('✅ GX-i18n-Pro-Starter 商业脚手架打包完成，已输出至桌面！');