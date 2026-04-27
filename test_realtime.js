
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Subscribing to realtime...');
  const channel = supabase
    .channel('test_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
      console.log('Received payload:', JSON.stringify(payload, null, 2));
    })
    .subscribe((status) => {
      console.log('Subscription status:', status);
    });

  // Keep alive for 10 seconds
  setTimeout(() => {
    console.log('Closing...');
    supabase.removeChannel(channel);
    process.exit(0);
  }, 10000);
}
run();

