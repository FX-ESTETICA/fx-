import { Project, SyntaxKind } from 'ts-morph';
import crypto from 'crypto';
import fs from 'fs';

const project = new Project({ tsConfigFilePath: './tsconfig.json' });
// Only process tsx files
const sourceFiles = project.getSourceFiles(['src/**/*.tsx']);

const zhRegex = /[\u4e00-\u9fa5]/;
let zhDict = {};
try {
  zhDict = JSON.parse(fs.readFileSync('./messages/zh.json', 'utf-8'));
} catch(e) {}

let modifiedFiles = 0;

sourceFiles.forEach(sourceFile => {
    // Skip already translated files or layout/config files
    const pathStr = sourceFile.getFilePath();
    if (pathStr.includes('app/home/page.tsx') || pathStr.includes('app/login/page.tsx') || pathStr.includes('layout.tsx')) return;

    let hasChanges = false;
    const baseName = sourceFile.getBaseNameWithoutExtension();
    const namespace = (baseName === 'page' || baseName === 'index') 
        ? sourceFile.getDirectory().getBaseName().replace(/[^a-zA-Z0-9]/g, '') 
        : baseName.replace(/[^a-zA-Z0-9]/g, '');

    if (!zhDict[namespace]) zhDict[namespace] = {};

    // Helper to generate key
    const getKey = (text) => {
        const hash = crypto.createHash('md5').update(text).digest('hex').slice(0, 6);
        return `txt_${hash}`;
    };

    // 1. Process JSX Text
    const jsxTexts = sourceFile.getDescendantsOfKind(SyntaxKind.JsxText);
    let needsT = false;

    jsxTexts.forEach(node => {
        const text = node.getLiteralText();
        if (zhRegex.test(text)) {
            const trimmed = text.trim();
            if (!trimmed) return;
            const key = getKey(trimmed);
            zhDict[namespace][key] = trimmed;
            
            // Replace text with {t('key')}
            // We must replace the whole node text to preserve spaces if needed, but it's safer to just replace the trimmed part if possible.
            // For simplicity, replace the whole node with JSX expression
            node.replaceWithText(`{t('${key}')}`);
            needsT = true;
            hasChanges = true;
        }
    });

    // 2. Process String Literals in JSX Attributes
    const stringLits = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);
    stringLits.forEach(node => {
        const text = node.getLiteralValue();
        if (zhRegex.test(text)) {
            const parent = node.getParent();
            if (parent.getKind() === SyntaxKind.JsxAttribute) {
                const key = getKey(text);
                zhDict[namespace][key] = text;
                node.replaceWithText(`{t('${key}')}`);
                needsT = true;
                hasChanges = true;
            }
        }
    });

    if (hasChanges && needsT) {
        // 3. Inject useTranslations hook
        // Find the main React component. Usually the default export or the first function with JSX
        let targetFunc = null;
        
        // Try default export first
        const defaultExport = sourceFile.getDefaultExportSymbol();
        if (defaultExport) {
            const decl = defaultExport.getDeclarations()[0];
            if (decl && (decl.getKind() === SyntaxKind.FunctionDeclaration || decl.getKind() === SyntaxKind.VariableDeclaration)) {
                targetFunc = decl.getKind() === SyntaxKind.VariableDeclaration ? decl.getInitializerIfKind(SyntaxKind.ArrowFunction) : decl;
            }
        }

        // Fallback to first function returning JSX
        if (!targetFunc) {
            for (const func of sourceFile.getFunctions()) {
                if (func.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0) {
                    targetFunc = func;
                    break;
                }
            }
        }

        if (!targetFunc) {
            // Check variable declarations for arrow functions
            for (const varDecl of sourceFile.getVariableDeclarations()) {
                const init = varDecl.getInitializer();
                if (init && init.getKind() === SyntaxKind.ArrowFunction) {
                    if (init.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0) {
                        targetFunc = init;
                        break;
                    }
                }
            }
        }

        if (targetFunc) {
            const body = targetFunc.getBody();
            if (body && body.getKind() === SyntaxKind.Block) {
                const bodyText = body.getText();
                if (!bodyText.includes('useTranslations')) {
                    body.insertStatements(0, `const t = useTranslations('${namespace}');`);
                }
            } else if (body && body.getKind() !== SyntaxKind.Block) {
                console.log(`[Warning] Implicit return arrow function in ${sourceFile.getBaseName()}. Skipping injection.`);
                return; // Revert changes in memory by not saving
            }
        } else {
            console.log(`[Warning] No target function found in ${sourceFile.getBaseName()}. Skipping injection.`);
            return; 
        }

        // 4. Inject Import
        const imports = sourceFile.getImportDeclarations();
        const hasNextIntl = imports.some(i => i.getModuleSpecifierValue() === 'next-intl');
        if (!hasNextIntl) {
            sourceFile.addImportDeclaration({
                namedImports: ['useTranslations'],
                moduleSpecifier: 'next-intl'
            });
        }

        // Save
        sourceFile.saveSync();
        modifiedFiles++;
    }
});

fs.writeFileSync('./messages/zh.json', JSON.stringify(zhDict, null, 2));
console.log(`Successfully transformed ${modifiedFiles} files.`);
