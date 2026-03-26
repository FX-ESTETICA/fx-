const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = envFile.split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    acc[match[1]] = match[2].replace(/['"]/g, '').trim();
  }
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Checking phone: 3758376252");
  
  // Test 1: Just querying profiles to see what's there
  console.log("--- TEST 1: Get any profiles ---");
  const { data: allData, error: err1 } = await supabase.from('profiles').select('id, phone, gx_id').limit(5);
  console.log(allData);
  if (err1) console.log(err1);

  // Test 2: Specific phone
  console.log("--- TEST 2: Exact phone match ---");
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', '3758736252');

  console.log("Data:", data);
  console.log("Error:", error);
}

test();