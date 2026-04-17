import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminEmail = envConfig.NEXT_PUBLIC_ADMIN_EMAIL;
const adminPassword = envConfig.NEXT_PUBLIC_ADMIN_PASSWORD;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  
  if (authError) {
    console.error('Login failed:', authError);
    return;
  }
  
  // Now try to fetch the first few bookings
  const { data: bookings, error: bError } = await supabase.from('bookings').select('*').limit(5);
  console.log('Bookings:', bookings);
}

main();