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

// 1. DataMatrixAssets 盲区
inject('DataMatrixAssets', 'echo_1', '今天在 XX 咖啡馆体验了手冲，环境非常赛博朋克。', 'Experienced pour-over at XX Cafe today, very cyberpunk vibe.', 'Ho provato il caffè filtro al XX Cafe oggi, atmosfera molto cyberpunk.');
inject('DataMatrixAssets', 'echo_2', '刚刚完成了空间跃迁，节点同步成功。', 'Just completed spatial jump, node synchronization successful.', 'Appena completato il salto spaziale, sincronizzazione del nodo riuscita.');
inject('DataMatrixAssets', 'echo_3', '附近的美业中心正在进行全息投影测试，非常震撼。', 'The nearby beauty center is doing a holographic projection test, absolutely stunning.', 'Il centro estetico vicino sta facendo un test di proiezione olografica, assolutamente sbalorditivo.');

// 2. HomeClient 盲区
inject('Home', 'place_1_name', 'The Cyber Sushi', 'The Cyber Sushi', 'The Cyber Sushi');
inject('Home', 'place_2_name', 'Neon Coffee Roasters', 'Neon Coffee Roasters', 'Neon Coffee Roasters');
inject('Home', 'place_3_name', 'Midnight Noodle Bar', 'Midnight Noodle Bar', 'Midnight Noodle Bar');
inject('Home', 'place_4_name', 'Lumina Beauty Studio', 'Lumina Beauty Studio', 'Lumina Beauty Studio');
inject('Home', 'place_5_name', 'Zenith Hair Salon', 'Zenith Hair Salon', 'Zenith Hair Salon');
inject('Home', 'place_6_name', 'The Grand Horizon Hotel', 'The Grand Horizon Hotel', 'The Grand Horizon Hotel');

// 3. Onboarding 盲区
inject('onboarding', 'benefit_1_title', '快速上线', 'Fast Deployment', 'Distribuzione Rapida');
inject('onboarding', 'benefit_1_desc', '5分钟完成节点配置，即刻接入银河流量池', 'Complete node configuration in 5 mins, instantly access the galaxy traffic pool', 'Completa la configurazione del nodo in 5 minuti, accedi istantaneamente al pool di traffico galattico');
inject('onboarding', 'benefit_2_title', '安全合规', 'Secure & Compliant', 'Sicuro e Conforme');
inject('onboarding', 'benefit_2_desc', 'Zero-Trust 协议保护，所有交易上链存证', 'Zero-Trust protocol protection, all transactions recorded on-chain', 'Protezione protocollo Zero-Trust, tutte le transazioni registrate su chain');
inject('onboarding', 'benefit_3_title', '精准推送', 'Precision Targeting', 'Targeting di Precisione');
inject('onboarding', 'benefit_3_desc', '基于 LBS 的智能算法，让附近的客户发现你', 'LBS-based smart algorithms to let nearby customers discover you', 'Algoritmi intelligenti basati su LBS per farvi scoprire dai clienti vicini');

fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2));
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
fs.writeFileSync(itPath, JSON.stringify(it, null, 2));

console.log('Mock Data Dictionaries injected successfully.');