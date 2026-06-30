import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hupqhiyxlghccdabqlrs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1cHFoaXl4bGdoY2NkYWJxbHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTIwODMsImV4cCI6MjA4OTgyODA4M30.97R66ik9lESuGLrlhodVOGId-wcDDcXbQ9hwVmFnVbs'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkConnection() {
  console.log("Checking connection and tables...")
  const { data, error } = await supabase
    .from('alert_rules')
    .select('id')
    .limit(1)

  if (error) {
    console.error("Error connecting to alert_rules:", error.message)
  } else {
    console.log("Successfully connected! alert_rules table exists.")
  }
}

checkConnection()
