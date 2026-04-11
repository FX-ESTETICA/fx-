const fs = require('fs');

const zhPath = 'messages/zh.json';
const enPath = 'messages/en.json';
const itPath = 'messages/it.json';

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
const it = JSON.parse(fs.readFileSync(itPath, 'utf-8'));

function inject(ns, key, z, e, i) {
  if (!zh[ns]) zh[ns] = {};
  if (!en[ns]) en[ns] = {};
  if (!it[ns]) it[ns] = {};
  zh[ns][key] = z;
  en[ns][key] = e;
  it[ns][key] = i;
}

// PhoneAuthBar 报错盲区
inject('PhoneAuthBar', 'sending', '正在发送...', 'Sending...', 'Invio in corso...');
inject('PhoneAuthBar', 'code_sent', '验证码已发送', 'Verification code sent', 'Codice di verifica inviato');
inject('PhoneAuthBar', 'verifying', '正在验证...', 'Verifying...', 'Verifica in corso...');
inject('PhoneAuthBar', 'bind_success', '绑定成功', 'Binding successful', 'Associazione riuscita');
inject('PhoneAuthBar', 'invalid_code', '验证码错误或已过期', 'Invalid or expired code', 'Codice non valido o scaduto');
inject('PhoneAuthBar', 'phone_taken', '该终端已被其他实体绑定', 'This terminal is bound to another entity', 'Questo terminale è associato a un altra entità');

// Nebula Error
inject('Nebula', 'err_upgrade_failed', '无法提升该用户的系统权限级别', 'Unable to upgrade system privileges for this user', 'Impossibile aggiornare i privilegi di sistema per questo utente');
inject('Nebula', 'err_missing_boss', '缺少 Boss 身份标识', 'Missing Boss identity', 'Identità Boss mancante');
inject('Nebula', 'auth_failed', '授权失败', 'Authorization failed', 'Autorizzazione fallita');
inject('Nebula', 'node_op_failed', '节点操作失败', 'Node operation failed', 'Operazione nodo fallita');
inject('Nebula', 'user_not_found', '未找到该用户ID，请核对。', 'User ID not found, please verify.', 'ID utente non trovato, si prega di verificare.');

// Boss Approvals
inject('BossApprovals', 'err_missing_profile', '无法定位申请人的物理身份 (Profile ID)，请确保该用户已初始化基础档案', 'Unable to locate applicant physical identity (Profile ID). Ensure basic profile is initialized.', 'Impossibile individuare identità fisica del richiedente (Profile ID). Assicurarsi che il profilo base sia inizializzato.');
inject('BossApprovals', 'approval_failed', '审批执行失败，请检查数据库权限或约束', 'Approval execution failed, please check database permissions or constraints', 'Esecuzione approvazione fallita, verificare i permessi o i vincoli del database');


fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2));
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
fs.writeFileSync(itPath, JSON.stringify(it, null, 2));

console.log('Error Data Dictionaries injected successfully.');