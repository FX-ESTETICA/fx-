import fs from 'fs';
import { Project, SyntaxKind } from 'ts-morph';
const project = new Project({ tsConfigFilePath: './tsconfig.json' });

const files = [
  'src/app/nebula/page.tsx',
  'src/app/spatial/page.tsx',
  'src/features/analytics/components/AnalyticsDashboard.tsx',
  'src/features/calendar/components/IndustryCalendar.tsx',
  'src/features/calendar/components/NebulaConfigHub.tsx'
];

const zhDict = JSON.parse(fs.readFileSync('messages/zh.json', 'utf-8'));

files.forEach(f => {
  const sourceFile = project.getSourceFile(f);
  if (!sourceFile) {
    console.log("Not found", f);
    return;
  }
  const baseName = sourceFile.getBaseNameWithoutExtension();
  const namespace = (baseName === 'page' || baseName === 'index') 
        ? sourceFile.getDirectory().getBaseName().replace(/[^a-zA-Z0-9]/g, '') 
        : baseName.replace(/[^a-zA-Z0-9]/g, '');

  const nsDict = zhDict[namespace] || {};
  // Inverse dict: text -> key
  const textToKey = {};
  for (const [k, v] of Object.entries(nsDict)) {
    textToKey[v] = k;
  }

  let hasChanges = false;

  const replaceText = (node, text) => {
    const trimmed = text.trim();
    if (textToKey[trimmed]) {
      node.replaceWithText(`{t('${textToKey[trimmed]}')}`);
      hasChanges = true;
    }
  };

  sourceFile.getDescendantsOfKind(SyntaxKind.JsxText).forEach(node => {
    replaceText(node, node.getLiteralText());
  });

  sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral).forEach(node => {
    if (node.getFirstAncestorByKind(SyntaxKind.JsxElement) || node.getFirstAncestorByKind(SyntaxKind.JsxSelfClosingElement)) {
       replaceText(node, node.getLiteralValue());
    }
  });

  if (hasChanges) {
    // Only inject import, don't inject const t
    const imports = sourceFile.getImportDeclarations();
    if (!imports.some(i => i.getModuleSpecifierValue() === 'next-intl')) {
      sourceFile.addImportDeclaration({
        namedImports: ['useTranslations'],
        moduleSpecifier: 'next-intl'
      });
    }
    sourceFile.saveSync();
  }
});
console.log("Micro surgery applied strings.");