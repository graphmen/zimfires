import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hupqhiyxlghccdabqlrs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1cHFoaXl4bGdoY2NkYWJxbHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTIwODMsImV4cCI6MjA4OTgyODA4M30.97R66ik9lESuGLrlhodVOGId-wcDDcXbQ9hwVmFnVbs'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCreate() {
  console.log("Testing insert...")
  const { data, error } = await supabase
    .from('alert_rules')
    .insert([{
      name: "Node Test Rule",
      severity: "info",
      alert_type: "FIRE"
    }])
    .select()

  if (error) {
    console.error("Insert error:", error)
  } else {
    console.log("Insert success:", data)
  }
}

testCreate()
