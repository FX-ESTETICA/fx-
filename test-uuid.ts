import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function test() {
  const currentUserId = '6704bcd0-0308-43b2-b2c0-dbd085b85589'; // A random UUID
  console.log('Fetching for UUID:', currentUserId);
  const start = Date.now();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
    .order('created_at', { ascending: false })
    .limit(100);
  
  console.log('Time taken:', Date.now() - start, 'ms');
  if (error) console.error('Error:', error);
  else console.log('Success, rows:', data?.length);
}

test();
