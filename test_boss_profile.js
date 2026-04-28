require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('profiles').select('id, email, gx_id, merchant_gx_id, merchant_phone').limit(50);
  console.log('Profiles:', data);
  console.log('Error:', error);
}
test();
