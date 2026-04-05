import fs from 'fs';
import { execSync } from 'child_process';

try {
  execSync('npx tsc --noEmit');
} catch (e) {
  const output = e.stdout.toString();
  const lines = output.split('\n');
  const filesToFix = {};
  
  lines.forEach(line => {
    const match = line.match(/(.+?)\((\d+),(\d+)\): error TS6133: 't'/);
    if (match) {
      const file = match[1];
      const lineNum = parseInt(match[2], 10);
      if (!filesToFix[file]) filesToFix[file] = [];
      filesToFix[file].push(lineNum);
    }
  });

  for (const [file, lineNums] of Object.entries(filesToFix)) {
    const contentLines = fs.readFileSync(file, 'utf-8').split('\n');
    // sort descending so we don't mess up line numbers when deleting
    lineNums.sort((a, b) => b - a).forEach(lineNum => {
      // Remove that line
      contentLines.splice(lineNum - 1, 1);
    });
    fs.writeFileSync(file, contentLines.join('\n'));
    console.log(`Fixed ${lineNums.length} unused t in ${file}`);
  }
}