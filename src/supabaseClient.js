import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xecwyehgbcgguxicvapg.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Xbdj0mm17ajCYRdTQgKB4g_G2cSF036'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
