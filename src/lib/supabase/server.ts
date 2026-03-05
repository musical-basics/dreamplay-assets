// Server-side Supabase client factory (imported by server actions)

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

export function getSupabase() {
    return createClient(supabaseUrl, supabaseServiceKey)
}
