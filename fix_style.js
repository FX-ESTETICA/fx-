const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walk(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

let filesChanged = 0;
walk('src', function(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Remove empty style properties that look like `style ` or `style\n` before className
    content = content.replace(/\bstyle\s+(className)/g, '$1');
    content = content.replace(/\bstyle\s+(>)/g, '$1');
    content = content.replace(/\bstyle\n/g, '\n');
    content = content.replace(/\bstyle\s+\/>/g, '/>');
    content = content.replace(/<motion\.div style className=/g, '<motion.div className=');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        filesChanged++;
        console.log('Fixed empty style prop: ' + filePath);
    }
});

console.log('Total files fixed: ' + filesChanged);
