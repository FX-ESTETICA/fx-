const fs = require('fs');
const path = require('path');

function cleanFileSafely(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    const prefix = `([a-z-]+:)*`;
    const colors = 'cyan|purple|green|teal|fuchsia|violet|pink|rose|emerald|lime|indigo|sky';
    const grays = 'gray|zinc|slate|neutral|stone';

    const lb = `(?<="|\\s|')`;

    const regexes = [
        new RegExp(`${lb}${prefix}shadow(-\\w+)?(-\\[[^\\]]+\\])?`, 'g'),
        new RegExp(`${lb}${prefix}drop-shadow(-\\w+)?(-\\[[^\\]]+\\])?`, 'g'),
        new RegExp(`${lb}${prefix}blur(-\\w+)?(-\\[\\d+px\\])?`, 'g'),
        new RegExp(`${lb}${prefix}backdrop-blur(-\\w+)?`, 'g'),
        new RegExp(`${lb}${prefix}(bg|text|border(-[tblr])?|ring|outline|divide|from|via|to|fill|stroke)-([a-z]+-)?(${colors})(-\\d+)?(\\/[0-9]+)?(-\\[[^\\]]+\\])?`, 'g'),
        new RegExp(`${lb}${prefix}(bg|text|border(-[tblr])?|ring|outline|divide|from|via|to|fill|stroke)-([a-z]+-)?(${grays})(-\\d+)?(\\/[0-9]+)?(-\\[[^\\]]+\\])?`, 'g'),
        new RegExp(`${lb}glowColor="[^"]+"`, 'g'),
        new RegExp(`${lb}text-gradient-cyan`, 'g'),
    ];

    let newContent = content;
    regexes.forEach(regex => {
        if (regex.test(newContent)) {
            changed = true;
            newContent = newContent.replace(regex, ''); 
        }
    });

    if (changed) {
        try {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Cleaned:', filePath);
        } catch(e) {
            console.error('Error saving', filePath, e.message);
        }
    }
}

function traverseDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverseDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            cleanFileSafely(fullPath);
        }
    });
}

traverseDir(path.join(__dirname, 'src'));
console.log('Done 4!');
