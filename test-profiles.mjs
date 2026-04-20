import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wtffzstwzagbwayidoun.supabase.co',
  'sb_publishable_7lGFRVvlaf7gDx8iq0IPRg_h3HODZcn'
);

async function testQuery() {
  console.log("Checking profiles table columns...");
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error("Query failed with error:", error);
  } else {
    console.log("Profiles row:", data[0]);
  }
}

testQuery();
