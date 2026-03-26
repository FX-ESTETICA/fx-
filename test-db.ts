import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Checking phone: 3758376252");
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', '3758376252');

  console.log("Data:", data);
  console.log("Error:", error);
}

test();