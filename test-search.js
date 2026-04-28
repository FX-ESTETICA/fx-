import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  const queries = ['3758376252', '000018'];

  for (const q of queries) {
    console.log(`\n--- Searching for: ${q} ---`);
    const cleanQuery = q.replace(/[^\w\d\u4e00-\u9fa5]/g, '');
    console.log(`Clean Query: ${cleanQuery}`);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error(`Error querying columns:`, error);
    } else if (data && data.length > 0) {
      console.log(`Found columns in profiles table:`);
      console.log(Object.keys(data[0]).join(', '));
    } else {
       console.log('No data found to infer columns.');
    }

  }
}

runTest();