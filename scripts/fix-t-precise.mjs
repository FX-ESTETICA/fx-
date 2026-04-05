import fs from 'fs';
import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({ tsConfigFilePath: './tsconfig.json' });

const files = [
  { path: 'src/app/nebula/page.tsx', ns: 'nebula' },
  { path: 'src/app/spatial/page.tsx', ns: 'spatial' },
  { path: 'src/features/analytics/components/AnalyticsDashboard.tsx', ns: 'AnalyticsDashboard' },
  { path: 'src/features/calendar/components/IndustryCalendar.tsx', ns: 'IndustryCalendar' },
  { path: 'src/features/calendar/components/NebulaConfigHub.tsx', ns: 'NebulaConfigHub' }
];

files.forEach(({path, ns}) => {
  const sourceFile = project.getSourceFile(path);
  if (!sourceFile) return;

  // Find all function-like declarations
  const functions = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionExpression)
  ];

  let changed = false;

  functions.forEach(func => {
    const body = func.getBody();
    if (body && body.getKind() === SyntaxKind.Block) {
      const text = body.getText();
      // If body uses t(' and doesn't declare it
      if (text.includes("t('") && !text.includes(`const t = useTranslations`)) {
        body.insertStatements(0, `const t = useTranslations('${ns}');`);
        changed = true;
      }
    } else if (body && body.getKind() !== SyntaxKind.Block) {
      // It's an implicit return arrow function like `() => <div>{t('hash')}</div>`
      if (body.getText().includes("t('")) {
        // Try to replace the body with a block
        // ts-morph arrow function setBodyText doesn't automatically wrap in block if it was an expression
        // It's tricky. Let's just find the closest block and inject there, or inject at the top of the file if it's top level.
        // For simplicity, let's just find the parent function that HAS a block and inject it there if it's not already there.
        const parentBlockFunc = func.getFirstAncestor(node => {
          const k = node.getKind();
          return (k === SyntaxKind.FunctionDeclaration || k === SyntaxKind.ArrowFunction || k === SyntaxKind.FunctionExpression) && node.getBody()?.getKind() === SyntaxKind.Block;
        });
        if (parentBlockFunc) {
            const b = parentBlockFunc.getBody();
            if (!b.getText().includes(`const t = useTranslations`)) {
                b.insertStatements(0, `const t = useTranslations('${ns}');`);
                changed = true;
            }
        }
      }
    }
  });

  if (changed) {
    sourceFile.saveSync();
  }
});
console.log('Precise injection complete.');