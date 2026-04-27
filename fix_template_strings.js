const fs = require('fs');

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // We are looking for something like:
  // "some-class ${isLight ? "text-black" : "text-white"} other-class"
  // Let's replace the outer double quotes with backticks.
  // A regex that matches a double quote, then anything without double quotes except the inner ones.
  // Actually, in JS we can just match `className="...${isLight..."`
  // Because it's too complex with regex, let's just do it line by line
  let lines = content.split('\n');
  let fixedLines = lines.map(line => {
    let replaced = line;
    
    // Fix className="...${...}..."
    if (replaced.includes('className="') && replaced.includes('${isLight')) {
       // match everything from className=" to the closing "
       replaced = replaced.replace(/className="([^"]*\$\{isLight[^}]+\}[^"]*)"/g, 'className={`$1`}');
    }

    // Fix other strings like: : "text-red-500" : "${isLight ? "text-black" : "text-white"} group-hover"
    // We want to match: `"something ${isLight ? "val1" : "val2"} something"`
    // and replace the outer `"` with ```
    replaced = replaced.replace(/"([^"]*\$\{isLight \? "[^"]+" : "[^"]+"\}[^"]*)"/g, '`$1`');
    
    // What if it has multiple inner ternaries?
    // Let's just blindly replace `" ${isLight ` with `` ` ${isLight ``
    // It's safer to use manual parsing for the line
    let idx = replaced.indexOf('"${isLight');
    if (idx !== -1) {
        replaced = replaced.substring(0, idx) + '`' + replaced.substring(idx + 1);
        let endIdx = replaced.indexOf('"', idx + 1);
        while (endIdx !== -1 && replaced[endIdx-1] === '=') { // skip className="
             endIdx = replaced.indexOf('"', endIdx + 1);
        }
        // Actually, just find the last quote on the line and replace it if it's the matching one
        let lastIdx = replaced.lastIndexOf('"');
        if (lastIdx > idx) {
             replaced = replaced.substring(0, lastIdx) + '`' + replaced.substring(lastIdx + 1);
        }
    }

    return replaced;
  });

  fs.writeFileSync(filePath, fixedLines.join('\n'));
  console.log(`Fixed ${filePath}`);
}

fixFile('c:/Users/xu/Desktop/GX/src/app/home/HomeClient.tsx');
fixFile('c:/Users/xu/Desktop/GX/src/app/discovery/DiscoveryClient.tsx');
