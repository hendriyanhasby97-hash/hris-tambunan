// App/koneksi.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://rjdymyzeujfxzqwwhxbb.supabase.co'; // Ganti dengan URL Supabase-mu
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqZHlteXpldWpmeHpxd3doeGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MjI2OTQsImV4cCI6MjA5NjE5ODY5NH0.dUvvgTawV0ZoOGy8VFJ91GkxNufqcITRBAiSoQ3q3tc'; // Ganti dengan Anon Key-mu

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
