import { createClient } from '@supabase/supabase-js';
const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
client.auth.signUp({
  email: 'testsignup' + Date.now() + '@switchr.test',
  password: 'Test1234!',
  options: { data: { username: 'testuser' } }
}).then(({ data, error }) => {
  console.log('Error Message:', error ? error.message : 'No error');
  console.log('Error Full:', error ? JSON.stringify(error) : null);
});
