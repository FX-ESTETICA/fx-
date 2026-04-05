import fs from 'fs';
import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({ tsConfigFilePath: './tsconfig.json' });
const files = project.getSourceFiles(['src/app/nebula/page.tsx', 'src/features/calendar/components/IndustryCalendar.tsx', 'src/features/analytics/components/AnalyticsDashboard.tsx']);

files.forEach(sourceFile => {
  let changed = false;
  sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach(decl => {
    if (decl.getName() === 't' && decl.getInitializer() && decl.getInitializer().getText().startsWith('useTranslations')) {
      const block = decl.getFirstAncestorByKind(SyntaxKind.Block);
      if (block) {
        const text = block.getText();
        // Check if there is another t() call besides the declaration
        // A simple way is to match all `t(` and if count is 1 (which is `useTranslations(t)` wait no `t` is not called here).
        // Let's just check if `t(` or `t (` exists in the text.
        const uses = text.match(/t\s*\(/g);
        if (!uses) {
            decl.getVariableStatement().remove();
            changed = true;
        }
      }
    }
  });
  if (changed) sourceFile.saveSync();
});
console.log('Unused t removed safely.');