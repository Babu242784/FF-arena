import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xocwyohqbcgguxlovapg.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_9Nf-byu-HPfY2H0q7LHAxQ_xHKJpy4L'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
