import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wtffzstwzagbwayidoun.supabase.co',
  'sb_publishable_7lGFRVvlaf7gDx8iq0IPRg_h3HODZcn'
);

async function testQuery() {
  console.log("Testing feed query...");
  let query = supabase
    .from('items')
    .select('*, profiles:user_id(id, username, avatar_url, average_rating, total_swaps, accepted_terms)')
    .or('status.eq.active,status.is.null')
    .limit(100);

  const { data, error } = await query;
  
  if (error) {
    console.error("Query failed with error:", error);
  } else {
    console.log("Query succeeded! Found items:", data.length);
  }
}

testQuery();
