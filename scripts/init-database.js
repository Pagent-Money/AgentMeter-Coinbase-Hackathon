import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: './service/.env' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Please check your service/.env file.')
  console.log('Required variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function initDatabase() {
  try {
    console.log('🚀 Initializing AgentMeter Supabase database...')

    // Test connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('projects')
      .select('count')
      .limit(1)

    if (connectionError) {
      throw new Error(`Failed to connect to Supabase: ${connectionError.message}`)
    }

    console.log('✅ Connected to Supabase successfully')

    // Check if tables exist by trying to query them
    const tables = ['projects', 'metering_events', 'billing_records']
    const tableStatus = {}

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1)
        
        if (error) {
          tableStatus[table] = 'missing'
        } else {
          tableStatus[table] = 'exists'
        }
      } catch (err) {
        tableStatus[table] = 'missing'
      }
    }

    console.log('\n📊 Table Status:')
    Object.entries(tableStatus).forEach(([table, status]) => {
      const icon = status === 'exists' ? '✅' : '❌'
      console.log(`  ${icon} ${table}: ${status}`)
    })

    const missingTables = Object.entries(tableStatus)
      .filter(([_, status]) => status === 'missing')
      .map(([table, _]) => table)

    if (missingTables.length > 0) {
      console.log('\n⚠️  Some tables are missing. Please run the SQL schema in Supabase:')
      console.log('   1. Go to your Supabase dashboard')
      console.log('   2. Navigate to SQL Editor')
      console.log('   3. Run the schema from: database/supabase-schema.sql')
      console.log('\n   Missing tables:', missingTables.join(', '))
    } else {
      console.log('\n✅ All required tables are present')
      
      // Check for sample data
      const { data: projects } = await supabase
        .from('projects')
        .select('count')
        .limit(1)

      const { data: events } = await supabase
        .from('metering_events')
        .select('count')
        .limit(1)

      console.log('\n📈 Database Stats:')
      console.log(`  Projects: ${projects?.length || 0}`)
      console.log(`  Metering Events: ${events?.length || 0}`)

      if (!projects?.length && !events?.length) {
        console.log('\n💡 Database is empty. Consider running: npm run seed')
      }
    }

    console.log('\n🎉 Database initialization completed!')

  } catch (error) {
    console.error('❌ Error initializing database:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('  1. Check your Supabase credentials in service/.env')
    console.log('  2. Ensure your Supabase project is active')
    console.log('  3. Verify RLS policies allow service role access')
    console.log('  4. Run the SQL schema if tables are missing')
    process.exit(1)
  }
}

initDatabase() 