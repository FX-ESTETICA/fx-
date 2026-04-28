import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkQuery() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.guest_001,receiver_id.eq.guest_001`);
    
  console.log('Result:', data, 'Error:', error);
}

checkQuery();