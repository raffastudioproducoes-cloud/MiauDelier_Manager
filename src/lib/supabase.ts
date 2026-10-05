import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dimjnihremxztedueoob.supabase.co';
const supabaseAnonKey = 'sb_publishable__ubqYS9Q869Z7U_I1rbVDg_mLrP_NUo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
