import fs from 'fs';
const zh = JSON.parse(fs.readFileSync('messages/zh.json', 'utf-8'));
const en = JSON.parse(fs.readFileSync('messages/en.json', 'utf-8'));
const it = JSON.parse(fs.readFileSync('messages/it.json', 'utf-8'));

for (const ns in zh) {
  if (!en[ns]) en[ns] = {};
  if (!it[ns]) it[ns] = {};
  for (const key in zh[ns]) {
    if (!en[ns][key]) en[ns][key] = `[EN] ${zh[ns][key]}`;
    if (!it[ns][key]) it[ns][key] = `[IT] ${zh[ns][key]}`;
  }
}

fs.writeFileSync('messages/en.json', JSON.stringify(en, null, 2));
fs.writeFileSync('messages/it.json', JSON.stringify(it, null, 2));
console.log('Dictionaries synced.');