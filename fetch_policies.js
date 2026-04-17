import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.rpc('get_policies'); // I don't know if this rpc exists
  if (error) {
    // let's try querying pg_policies if we can
    const { data: pData, error: pError } = await supabase.from('pg_policies').select('*').eq('tablename', 'bookings');
    console.log(pData, pError);
  }
}

main();