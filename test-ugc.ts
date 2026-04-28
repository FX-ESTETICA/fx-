import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkUgcPosts() {
  const { data, error } = await supabase
    .from('ugc_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
    
  console.log('Result:', JSON.stringify(data, null, 2), 'Error:', error);
}

checkUgcPosts();