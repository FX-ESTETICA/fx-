import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testWithRealUser() {
  const { data: msgs } = await supabase
    .from('messages')
    .select('sender_id')
    .not('sender_id', 'is', null)
    .limit(1);
    
  if (!msgs || msgs.length === 0) return console.log('No messages');
  const userId = msgs[0].sender_id;
  console.log('Testing with user:', userId);
  
  const start = Date.now();
  const { data } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(100);
    
  console.log('Messages fetch took:', Date.now() - start, 'ms. Count:', data?.length);
  
  if (!data) return;
  
  const validUuids = new Set<string>();
  data.forEach(m => {
    if (m.sender_id) validUuids.add(m.sender_id);
    if (m.receiver_id) validUuids.add(m.receiver_id);
  });
  
  const start2 = Date.now();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', Array.from(validUuids));
    
  console.log('Profiles fetch took:', Date.now() - start2, 'ms. Count:', profiles?.length);
}

testWithRealUser();