import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://swoyqnqbcgpxrtcvwpyg.supabase.co'
const supabaseAnonKey = 'sb_publishable_9Nf-byu-9PfY2H0q7LHxQ_xHKJpy4L'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
})
