import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hiltlozttngjthpudyea.supabase.co'
const supabaseAnonKey = 'sb_publishable_W4Ie88SSBhKchu2d4gkzbA_HLo9qrmC'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)