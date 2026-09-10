import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xecwyehgbcgguxicvapg.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlY3d5ZWhxYmNnZ3V4aWN2YXBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjE4NDMsImV4cCI6MjEwMzk5Nzg0M30.yAk_hGId69tzNdTyBnXP5acrClvgXIC1lOQgQInmUqQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
