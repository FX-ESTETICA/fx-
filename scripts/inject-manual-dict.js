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

// 1. ProfileHeader 盲区词汇
inject('ProfileHeader', 'role_user', '生活', 'Life', 'Vita');
inject('ProfileHeader', 'role_merchant', '智控', 'Nexus Control', 'Controllo Nexus');
inject('ProfileHeader', 'role_boss', 'BOSS', 'BOSS', 'BOSS');

inject('ProfileHeader', 'zodiac_aries', '白羊座', 'Aries', 'Ariete');
inject('ProfileHeader', 'zodiac_taurus', '金牛座', 'Taurus', 'Toro');
inject('ProfileHeader', 'zodiac_gemini', '双子座', 'Gemini', 'Gemelli');
inject('ProfileHeader', 'zodiac_cancer', '巨蟹座', 'Cancer', 'Cancro');
inject('ProfileHeader', 'zodiac_leo', '狮子座', 'Leo', 'Leone');
inject('ProfileHeader', 'zodiac_virgo', '处女座', 'Virgo', 'Vergine');
inject('ProfileHeader', 'zodiac_libra', '天秤座', 'Libra', 'Bilancia');
inject('ProfileHeader', 'zodiac_scorpio', '天蝎座', 'Scorpio', 'Scorpione');
inject('ProfileHeader', 'zodiac_sagittarius', '射手座', 'Sagittarius', 'Sagittario');
inject('ProfileHeader', 'zodiac_capricorn', '摩羯座', 'Capricorn', 'Capricorno');
inject('ProfileHeader', 'zodiac_aquarius', '水瓶座', 'Aquarius', 'Acquario');
inject('ProfileHeader', 'zodiac_pisces', '双鱼座', 'Pisces', 'Pesci');

inject('ProfileHeader', 'level_0_title', '启航', 'Voyage', 'Partenza');
inject('ProfileHeader', 'level_1_title', '适应', 'Adapt', 'Adattamento');
inject('ProfileHeader', 'level_2_title', '资深', 'Senior', 'Senior');
inject('ProfileHeader', 'level_3_title', '核心', 'Core', 'Nucleo');
inject('ProfileHeader', 'level_4_title', '先驱', 'Pioneer', 'Pioniere');
inject('ProfileHeader', 'level_5_title', '传奇', 'Legend', 'Leggenda');
inject('ProfileHeader', 'level_6_title', '远古实体', 'Ancient Entity', 'Entità Antica');

inject('ProfileHeader', 'copied', '已复制', 'Copied', 'Copiato');
inject('ProfileHeader', 'copy', '复制', 'Copy', 'Copia');

// 2. BottomNavBar 盲区词汇
inject('BottomNavBar', 'nav_home', '首页', 'Home', 'Home');
inject('BottomNavBar', 'nav_discovery', '发现', 'Discovery', 'Scoperta');
inject('BottomNavBar', 'nav_chat', '聊天', 'Chat', 'Chat');
inject('BottomNavBar', 'nav_me', '我的', 'Me', 'Io');

// 3. EliteResourceMatrix 盲区
inject('EliteResourceMatrix', 'unknown', '未知', 'Unknown', 'Sconosciuto');
inject('EliteResourceMatrix', 'copied', '已复制', 'Copied', 'Copiato');
inject('EliteResourceMatrix', 'copy', '复制', 'Copy', 'Copia');

// 4. HomeClient 盲区
inject('HomeClient', 'locating', '定位中...', 'Locating...', 'Localizzazione...');

// 5. MerchantDashboard 盲区
inject('MerchantDashboard', 'status_closed_today', '今日已临时歇业', 'Closed Temporarily Today', 'Chiuso Temporaneamente Oggi');
inject('MerchantDashboard', 'status_vacation', '处于长期休假中', 'On Long-term Vacation', 'In Vacanza a Lungo Termine');

fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2));
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
fs.writeFileSync(itPath, JSON.stringify(it, null, 2));

console.log('Dictionaries injected successfully.');
