import fs from 'fs';
import path from 'path';

const langs = ['zh', 'en', 'it'];
const msgsDir = path.resolve('messages');

for (const lang of langs) {
  const filePath = path.join(msgsDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) continue;
  
  let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  if (data['HomeClient'] && data['Home']) {
    // Merge HomeClient keys into Home
    for (const key in data['HomeClient']) {
      data['Home'][key] = data['HomeClient'][key];
    }
    // Delete HomeClient
    delete data['HomeClient'];
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Merged HomeClient into Home for ${lang}.json`);
  }
}
