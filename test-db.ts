import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function test() {
  console.log(`Connecting to: ${SUPABASE_URL}`);
  
  // Test if the profiles table exists (it should return data or an empty array, NOT an error)
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  
  if (error) {
    if (error.code === '42P01') {
      console.log("❌ Connection works, but the 'profiles' table is missing! You need to run the SQL file.");
    } else {
      console.log("❌ Unexpected error:", error.message);
    }
  } else {
    console.log("✅ SUCCESS! The database is connected and the tables are properly created!");
    console.log("You can now go to http://localhost:5173/auth and sign up using Email & Password.");
  }
}

test();
