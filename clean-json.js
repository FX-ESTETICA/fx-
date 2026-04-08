const fs = require('fs');
const path = 'messages/zh.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const cleanText = (text) => {
  // Remove ' / English' or ' (English)' patterns
  let cleaned = text.replace(/ \/ [A-Za-z \.&]+$/, '');
  cleaned = cleaned.replace(/ \([A-Za-z ,&]+\)$/, '');
  // specific prefix removals
  cleaned = cleaned.replace(/^No History \/ /, '');
  return cleaned;
};

const namespacesToClean = ['MerchantDashboard', 'UserDashboard', 'DualPaneBookingModal', 'BookingForm', 'BookingSuccess', 'analytics', 'nebula', 'onboarding', 'spatial', 'IndustryCalendar', 'NebulaConfigHub'];

for (const ns of namespacesToClean) {
  if (data[ns]) {
    for (const key in data[ns]) {
      if (typeof data[ns][key] === 'string') {
        const original = data[ns][key];
        const cleaned = cleanText(original);
        if (original !== cleaned) {
          console.log(`[${ns}] ${original} -> ${cleaned}`);
          data[ns][key] = cleaned;
        }
      }
    }
  }
}

// specific fixes for UserDashboard
if (data.UserDashboard) {
  data.UserDashboard['txt_e5533f'] = '空间名称';
  data.UserDashboard['txt_12269d'] = '集团名称';
  data.UserDashboard['txt_7b7c43'] = '联系电话';
  data.UserDashboard['txt_81f35c'] = '美业';
  data.UserDashboard['txt_2c5374'] = '餐饮';
  data.UserDashboard['txt_771f4a'] = '医疗';
  data.UserDashboard['txt_2a34d1'] = '健身';
  data.UserDashboard['txt_e0e1b5'] = '专家';
  data.UserDashboard['txt_5c4f50'] = '住宿';
  data.UserDashboard['txt_fe629b'] = '常规';
  data.UserDashboard['txt_ea2d0d'] = '03 / 核心视觉';
  data.UserDashboard['txt_6cbf43'] = '02 / 集团标志';
}

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('Cleaned zh.json successfully.');
