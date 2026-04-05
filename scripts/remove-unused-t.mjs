import fs from 'fs';
import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({ tsConfigFilePath: './tsconfig.json' });
const files = project.getSourceFiles(['src/**/*.tsx', 'src/**/*.ts']);

files.forEach(sourceFile => {
  let changed = false;
  sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach(decl => {
    if (decl.getName() === 't') {
      const block = decl.getFirstAncestorByKind(SyntaxKind.Block);
      if (block) {
        const text = block.getText();
        const matches = text.match(/t\(/g);
        // Usually there's at least `const t = useTranslations(`
        // But if `t(` only occurs 0 times (or maybe useTranslations is not matched by t()
        if (!text.includes("t('") && !text.includes('t("') && !text.includes('t(`')) {
            decl.getVariableStatement().remove();
            changed = true;
        }
      }
    }
  });
  if (changed) sourceFile.saveSync();
});
console.log('Unused t removed.');