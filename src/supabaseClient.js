import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xecwyehgbcgguxicvapg.supabase.co';
const supabaseAnonKey = 'sb_publishable_9Nf-byu-HPfY2H0q7LHAxQ_xHKJpy4L';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
