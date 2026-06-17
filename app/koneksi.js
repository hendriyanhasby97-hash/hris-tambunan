// koneksi.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://trxakqvaxleslwmngsvr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeGFrcXZheGxlc2x3bW5nc3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNzk2MjEsImV4cCI6MjA5NDY1NTYyMX0.R5tfv31hi75vbg4WpS7ORoWlHGC_YttajidK4HRcjks';

export const supabase = createClient(supabaseUrl, supabaseKey);
