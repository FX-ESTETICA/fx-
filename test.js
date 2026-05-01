const { execSync } = require('child_process');
try {
  const log = execSync('git log -S "PrivacySettings" --name-status').toString();
  console.log(log);
} catch(e) {
  console.log(e.stdout.toString());
}
