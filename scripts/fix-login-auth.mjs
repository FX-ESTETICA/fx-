import fs from 'fs';

const langs = ['zh', 'en', 'it'];
for (const lang of langs) {
  const p = `messages/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  if (data.LoginForm && data.LoginForm.txt_b05e70) {
    if (!data.Auth) data.Auth = {};
    data.Auth.txt_b05e70 = data.LoginForm.txt_b05e70;
    delete data.LoginForm.txt_b05e70;
    if (Object.keys(data.LoginForm).length === 0) delete data.LoginForm;
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
    console.log(`Fixed ${p}`);
  }
}
