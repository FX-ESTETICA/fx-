import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
  console.log("Checking messages policies...");
  // Let's try to query messages just to see if we get RLS errors
  const { data, error } = await supabase.from('messages').select('id, content').limit(1);
  console.log("Select result:", { data, error });
}

testDelete();