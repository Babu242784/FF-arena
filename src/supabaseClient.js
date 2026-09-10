import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xeoxyqhqbcgpxrtcvepg.supabase.co'
const supabaseAnonKey = 'sb_publishable_9Nf-byu-HPfY2H0q7LHAxQ_xHKJpy4L'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
})
