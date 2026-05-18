// ═══════════════════════════════════════════════════════════
// SwitchR QA Flood Test — Create test users, items & interactions
// ═══════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wtffzstwzagbwayidoun.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7lGFRVvlaf7gDx8iq0IPRg_h3HODZcn';

const USERS = [
  { email: 'qa_flood_1@switchr.test', password: 'QAflood123!', username: 'FloodUser_Alpha' },
  { email: 'qa_flood_2@switchr.test', password: 'QAflood123!', username: 'FloodUser_Beta' },
  { email: 'qa_flood_3@switchr.test', password: 'QAflood123!', username: 'FloodUser_Gamma' },
  { email: 'qa_flood_4@switchr.test', password: 'QAflood123!', username: 'FloodUser_Delta' },
  { email: 'qa_flood_5@switchr.test', password: 'QAflood123!', username: 'FloodUser_Epsilon' },
];

const CATEGORIES = ['Electronics', 'Fashion', 'Sports', 'Home', 'Books', 'Hobbies', 'Other'];
const CONDITIONS = ['Brand New', 'Like New', 'Good', 'Fair'];

const ITEMS_PER_USER = [
  [
    { title: 'MacBook Pro 2024', category: 'Electronics', sub_category: 'Laptop', condition: 'Like New', description: 'M3 chip, 16GB RAM, barely used', estimated_value: 1500, co2_saved_kg: 340 },
    { title: 'Nike Air Max 90', category: 'Fashion', sub_category: 'Sneakers', condition: 'Good', description: 'Size 10, minor wear on sole', estimated_value: 80, co2_saved_kg: 14 },
    { title: 'Canon EOS R6', category: 'Electronics', sub_category: 'Camera', condition: 'Like New', description: 'Full frame mirrorless, 2k shutter count', estimated_value: 1200, co2_saved_kg: 55 },
  ],
  [
    { title: 'Giant TCR Road Bike', category: 'Sports', sub_category: 'Road Bike', condition: 'Good', description: 'Carbon frame, Shimano 105 groupset', estimated_value: 900, co2_saved_kg: 190 },
    { title: 'Herman Miller Aeron', category: 'Home', sub_category: 'Ergonomic Chair', condition: 'Fair', description: 'Size B, adjustable arms, mesh needs repair', estimated_value: 400, co2_saved_kg: 120 },
    { title: 'iPad Pro 12.9"', category: 'Electronics', sub_category: 'Tablet', condition: 'Brand New', description: 'Sealed in box, M2 chip', estimated_value: 1100, co2_saved_kg: 80 },
  ],
  [
    { title: 'Patagonia Down Jacket', category: 'Fashion', sub_category: 'Jacket', condition: 'Like New', description: 'Size M, 800-fill goose down', estimated_value: 200, co2_saved_kg: 33 },
    { title: 'KitchenAid Stand Mixer', category: 'Home', sub_category: 'Kitchen Appliance', condition: 'Good', description: 'Artisan series, 5qt, red', estimated_value: 250, co2_saved_kg: 45 },
    { title: 'Complete Harry Potter Set', category: 'Books', sub_category: 'Book Set', condition: 'Good', description: 'Hardcover, first UK editions', estimated_value: 150, co2_saved_kg: 8 },
  ],
  [
    { title: 'PS5 Digital Edition', category: 'Electronics', sub_category: 'Gaming Console', condition: 'Like New', description: 'With extra DualSense controller', estimated_value: 350, co2_saved_kg: 95 },
    { title: 'Bose QC Ultra Headphones', category: 'Electronics', sub_category: 'Headphones', condition: 'Brand New', description: 'Noise cancelling, sealed box', estimated_value: 300, co2_saved_kg: 12 },
    { title: 'LEGO Millennium Falcon', category: 'Hobbies', sub_category: 'LEGO Set', condition: 'Brand New', description: 'UCS 75192, sealed', estimated_value: 800, co2_saved_kg: 25 },
  ],
  [
    { title: 'Dyson V15 Detect', category: 'Home', sub_category: 'Vacuum', condition: 'Good', description: 'All attachments included, laser head', estimated_value: 400, co2_saved_kg: 65 },
    { title: 'Samsung 4K Monitor 32"', category: 'Electronics', sub_category: 'Monitor', condition: 'Like New', description: 'S32A700, USB-C, 2 months old', estimated_value: 350, co2_saved_kg: 110 },
    { title: 'Vintage Leather Messenger Bag', category: 'Fashion', sub_category: 'Bag', condition: 'Fair', description: 'Genuine Italian leather, patina character', estimated_value: 120, co2_saved_kg: 18 },
  ],
];

// Placeholder images for each category
const PLACEHOLDER_IMAGES = {
  'Electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
  'Fashion':     'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
  'Sports':      'https://images.unsplash.com/photo-1571188654248-7a89013e986a?w=400',
  'Home':        'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  'Books':       'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
  'Hobbies':     'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400',
  'Other':       'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
};

const results = { users: [], items: [], bids: [], messages: [], errors: [] };

async function createUserAndItems(userDef, itemDefs, index) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  // 1. Sign up user
  console.log(`\n👤 Creating user: ${userDef.username} (${userDef.email})`);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: userDef.email,
    password: userDef.password,
    options: { data: { username: userDef.username } }
  });

  if (authError) {
    // Try sign in if already exists
    console.log(`  ⚠️ Signup error (${authError.message}), trying login...`);
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: userDef.email,
      password: userDef.password,
    });
    if (loginError) {
      results.errors.push(`User ${userDef.email}: ${loginError.message}`);
      return null;
    }
    results.users.push({ email: userDef.email, id: loginData.user.id, status: 'logged_in' });
    console.log(`  ✅ Logged in as ${loginData.user.id}`);
    
    // 2. Ensure profile exists
    const userId = loginData.user.id;
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (!profile) {
      await supabase.from('profiles').insert([{
        id: userId,
        username: userDef.username,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userDef.username}`,
      }]);
    }
    
    // Update profile with wishlist
    await supabase.from('profiles').update({
      username: userDef.username,
      wishlist_items: [
        { label: ITEMS_PER_USER[(index + 1) % ITEMS_PER_USER.length][0].sub_category },
        { label: ITEMS_PER_USER[(index + 2) % ITEMS_PER_USER.length][1].sub_category },
      ],
    }).eq('id', userId);
    
    // 3. Create items
    for (const itemDef of itemDefs) {
      console.log(`  📦 Posting: ${itemDef.title}`);
      const { data: item, error: itemError } = await supabase.from('items').insert([{
        user_id: userId,
        title: itemDef.title,
        category: itemDef.category,
        sub_category: itemDef.sub_category,
        condition: itemDef.condition,
        description: itemDef.description,
        estimated_value: itemDef.estimated_value,
        co2_saved_kg: itemDef.co2_saved_kg,
        image_url: PLACEHOLDER_IMAGES[itemDef.category],
        status: 'active',
      }]).select();
      
      if (itemError) {
        console.log(`    ❌ Error: ${itemError.message}`);
        results.errors.push(`Item "${itemDef.title}": ${itemError.message}`);
      } else {
        console.log(`    ✅ Created: ${item[0].id}`);
        results.items.push({ id: item[0].id, title: itemDef.title, userId });
      }
    }
    
    return { userId, supabase };
  } else {
    const userId = authData.user.id;
    results.users.push({ email: userDef.email, id: userId, status: 'created' });
    console.log(`  ✅ Created user: ${userId}`);
    
    // Wait for trigger to create profile
    await new Promise(r => setTimeout(r, 1000));
    
    // Update profile
    await supabase.from('profiles').update({
      username: userDef.username,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userDef.username}`,
      wishlist_items: [
        { label: ITEMS_PER_USER[(index + 1) % ITEMS_PER_USER.length][0].sub_category },
        { label: ITEMS_PER_USER[(index + 2) % ITEMS_PER_USER.length][1].sub_category },
      ],
    }).eq('id', userId);
    
    // Create items
    for (const itemDef of itemDefs) {
      console.log(`  📦 Posting: ${itemDef.title}`);
      const { data: item, error: itemError } = await supabase.from('items').insert([{
        user_id: userId,
        title: itemDef.title,
        category: itemDef.category,
        sub_category: itemDef.sub_category,
        condition: itemDef.condition,
        description: itemDef.description,
        estimated_value: itemDef.estimated_value,
        co2_saved_kg: itemDef.co2_saved_kg,
        image_url: PLACEHOLDER_IMAGES[itemDef.category],
        status: 'active',
      }]).select();
      
      if (itemError) {
        console.log(`    ❌ Error: ${itemError.message}`);
        results.errors.push(`Item "${itemDef.title}": ${itemError.message}`);
      } else {
        console.log(`    ✅ Created: ${item[0].id}`);
        results.items.push({ id: item[0].id, title: itemDef.title, userId });
      }
    }
    
    return { userId, supabase };
  }
}

async function createBidsAndMessages(clients) {
  // Cross-bid between users
  for (let i = 0; i < clients.length - 1; i++) {
    const bidder = clients[i];
    const receiver = clients[i + 1];
    
    if (!bidder || !receiver) continue;
    
    // Get items for both users
    const { data: bidderItems } = await bidder.supabase.from('items').select('id, title').eq('user_id', bidder.userId).limit(3);
    const { data: receiverItems } = await bidder.supabase.from('items').select('id, title').eq('user_id', receiver.userId).limit(3);
    
    if (!bidderItems?.length || !receiverItems?.length) continue;
    
    // Place a bid
    console.log(`\n🤝 Bid: ${bidderItems[0].title} → ${receiverItems[0].title}`);
    const { data: bid, error: bidError } = await bidder.supabase.from('bids').insert([{
      bidder_id: bidder.userId,
      receiver_id: receiver.userId,
      item_offered_id: bidderItems[0].id,
      item_wanted_id: receiverItems[0].id,
      status: 'pending',
    }]).select();
    
    if (bidError) {
      console.log(`  ❌ Bid error: ${bidError.message}`);
      results.errors.push(`Bid: ${bidError.message}`);
    } else {
      console.log(`  ✅ Bid created: ${bid[0].id}`);
      results.bids.push(bid[0]);
    }
    
    // Send a chat message
    const matchId = [bidder.userId, receiver.userId].sort().join('_');
    console.log(`💬 Message from ${USERS[i].username} to ${USERS[i+1].username}`);
    const { error: msgError } = await bidder.supabase.from('messages').insert([{
      sender_id: bidder.userId,
      receiver_id: receiver.userId,
      match_id: matchId,
      content: `Hey ${USERS[i+1].username}! Interested in a swap? I've got some great items listed.`,
    }]);
    
    if (msgError) {
      console.log(`  ❌ Message error: ${msgError.message}`);
      results.errors.push(`Message: ${msgError.message}`);
    } else {
      console.log(`  ✅ Message sent`);
      results.messages.push({ from: USERS[i].username, to: USERS[i+1].username });
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  SwitchR QA Flood Test');
  console.log('  Creating 5 users, 15 items, bids & chats');
  console.log('═══════════════════════════════════════════');

  const clients = [];
  for (let i = 0; i < USERS.length; i++) {
    const result = await createUserAndItems(USERS[i], ITEMS_PER_USER[i], i);
    if (result) clients.push(result);
  }

  await createBidsAndMessages(clients);

  console.log('\n═══════════════════════════════════════════');
  console.log('  FLOOD TEST RESULTS');
  console.log('═══════════════════════════════════════════');
  console.log(`  Users: ${results.users.length}/${USERS.length}`);
  console.log(`  Items: ${results.items.length}/${USERS.length * 3}`);
  console.log(`  Bids:  ${results.bids.length}`);
  console.log(`  Messages: ${results.messages.length}`);
  console.log(`  Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\n  ⚠️ ERRORS:');
    results.errors.forEach(e => console.log(`    - ${e}`));
  }
  
  console.log('\n═══════════════════════════════════════════');
}

main().catch(console.error);
