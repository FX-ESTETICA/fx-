import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Project, SyntaxKind } from 'ts-morph';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('[i18n-pipeline] ERROR: OPENAI_API_KEY is not set in environment variables.');
  process.exit(1);
}

const SYSTEM_PROMPT = `
You are a top-tier localization expert for a cyberpunk-style, high-end SaaS platform named "GX Core". 
The UI is extremely minimalist, dark-themed, and uses holographic/neon aesthetics. 
Your translations must be:
1. Extremely concise (to fit in tight UI buttons/labels).
2. Advanced and futuristic (e.g., use "Initialize Node" instead of "Open", "Engage" instead of "Start").
3. Accurate to the context provided.
You will receive a JSON object mapping a hash key to a Chinese string and its surrounding context code.
You MUST return ONLY a valid JSON object matching the exact keys, where each value is an object containing "en" and "it" translations.
Example Input:
{ "txt_a1b2c3": { "text": "摧毁联邦", "context": "<button>摧毁联邦</button>" } }
Example Output:
{ "txt_a1b2c3": { "en": "Obliterate Nexus", "it": "Annienta Nexus" } }
`;

async function translateWithAI(extractionMap) {
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(extractionMap) }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`OpenAI API Error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const resultJson = data.choices[0].message.content;
  return JSON.parse(resultJson);
}

async function runPipeline() {
  console.log('[i18n-pipeline] Scanning for new Chinese strings...');
  const project = new Project({ tsConfigFilePath: './tsconfig.json' });
  const sourceFiles = project.getSourceFiles(['src/**/*.tsx', 'src/**/*.ts']);
  
  const zhRegex = /[\u4e00-\u9fa5]/;
  
  // Load existing dictionaries
  const zhPath = path.resolve('messages/zh.json');
  const enPath = path.resolve('messages/en.json');
  const itPath = path.resolve('messages/it.json');
  
  const zhDict = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));
  const enDict = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  const itDict = JSON.parse(fs.readFileSync(itPath, 'utf-8'));

  const extractionMap = {}; // key -> { text, context, namespace, file }
  const modifiedFiles = new Set();

  const getKey = (text) => `txt_${crypto.createHash('md5').update(text).digest('hex').slice(0, 6)}`;

  sourceFiles.forEach(sourceFile => {
    // Skip specific complex files that are manually managed or layout files
    const filePath = sourceFile.getFilePath();
    if (filePath.includes('layout.tsx')) return;

    const baseName = sourceFile.getBaseNameWithoutExtension();
    const namespace = (baseName === 'page' || baseName === 'index') 
        ? sourceFile.getDirectory().getBaseName().replace(/[^a-zA-Z0-9]/g, '') 
        : baseName.replace(/[^a-zA-Z0-9]/g, '');

    if (!zhDict[namespace]) zhDict[namespace] = {};
    if (!enDict[namespace]) enDict[namespace] = {};
    if (!itDict[namespace]) itDict[namespace] = {};

    let fileHasChanges = false;
    let needsT = false;

    // Helper to process nodes
    const processNode = (node, text) => {
      const trimmed = text.trim();
      if (!trimmed || !zhRegex.test(trimmed)) return;
      
      const key = getKey(trimmed);
      
      // If it's already in the dictionary, we don't need to translate it again, 
      // but we still need to replace it in the code if it's hardcoded.
      if (!zhDict[namespace][key]) {
        zhDict[namespace][key] = trimmed;
        // Get surrounding code for context (up to 200 chars)
        const context = node.getParent()?.getText().substring(0, 200) || trimmed;
        extractionMap[key] = { text: trimmed, context, namespace };
      }

      // We only replace string literals in JSX attributes and JSX texts in this simple pass
      // Note: Full robust AST replacement requires careful handling of spaces and quotes.
      // For safety, we only extract here and let the user know what was found.
      // (Full auto-replacement is possible but we start with safe extraction and AI translation).
    };

    // Find all JSX Texts
    sourceFile.getDescendantsOfKind(SyntaxKind.JsxText).forEach(node => {
      processNode(node, node.getLiteralText());
    });

    // Find all String Literals
    sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral).forEach(node => {
      // Only if inside JSX
      if (node.getFirstAncestorByKind(SyntaxKind.JsxElement) || node.getFirstAncestorByKind(SyntaxKind.JsxSelfClosingElement)) {
         processNode(node, node.getLiteralValue());
      }
    });
  });

  const newKeysCount = Object.keys(extractionMap).length;
  if (newKeysCount === 0) {
    console.log('[i18n-pipeline] No new Chinese strings found. Pipeline complete.');
    return;
  }

  console.log(`[i18n-pipeline] Found ${newKeysCount} new strings. Calling OpenAI (gpt-4o-mini) for context-aware translation...`);
  
  try {
    const translations = await translateWithAI(extractionMap);
    
    // Apply translations
    for (const [key, data] of Object.entries(extractionMap)) {
      const ns = data.namespace;
      if (translations[key]) {
        enDict[ns][key] = translations[key].en || `[EN] ${data.text}`;
        itDict[ns][key] = translations[key].it || `[IT] ${data.text}`;
      } else {
        enDict[ns][key] = `[EN] ${data.text}`;
        itDict[ns][key] = `[IT] ${data.text}`;
      }
    }

    // Save dictionaries
    fs.writeFileSync(zhPath, JSON.stringify(zhDict, null, 2));
    fs.writeFileSync(enPath, JSON.stringify(enDict, null, 2));
    fs.writeFileSync(itPath, JSON.stringify(itDict, null, 2));

    console.log('[i18n-pipeline] Dictionaries updated successfully with AI translations.');
    console.log('[i18n-pipeline] Note: Please manually replace the hardcoded strings in your code with {t("hash")} for now to ensure 0-conflict safety.');

  } catch (error) {
    console.error('[i18n-pipeline] AI Translation failed:', error);
    process.exit(1);
  }
}

runPipeline();