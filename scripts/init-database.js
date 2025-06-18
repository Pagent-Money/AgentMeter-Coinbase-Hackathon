import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentmeter'

async function initDatabase() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('Connected to MongoDB')

    const db = client.db("agentmeter")

    // Create collections if they don't exist
    const collections = ['projects', 'meter_events']
    
    for (const collectionName of collections) {
      try {
        await db.createCollection(collectionName)
        console.log(`Created collection: ${collectionName}`)
      } catch (error) {
        if (error.code === 48) { // Collection already exists
          console.log(`Collection ${collectionName} already exists`)
        } else {
          console.error(`Error creating collection ${collectionName}:`, error)
        }
      }
    }

    // Create indexes for better performance
    const projectsCollection = db.collection("projects")
    
    try {
      await projectsCollection.createIndex({ id: 1 }, { unique: true })
      console.log('Created unique index on projects.id')
    } catch (error) {
      console.log('Index on projects.id already exists or error:', error.message)
    }

    try {
      await projectsCollection.createIndex({ createdAt: -1 })
      console.log('Created index on projects.createdAt')
    } catch (error) {
      console.log('Index on projects.createdAt already exists or error:', error.message)
    }

    const eventsCollection = db.collection("meter_events")
    
    try {
      await eventsCollection.createIndex({ project_id: 1, timestamp: -1 })
      console.log('Created index on meter_events.project_id and timestamp')
    } catch (error) {
      console.log('Index on meter_events.project_id already exists or error:', error.message)
    }

    try {
      await eventsCollection.createIndex({ agent_id: 1, timestamp: -1 })
      console.log('Created index on meter_events.agent_id and timestamp')
    } catch (error) {
      console.log('Index on meter_events.agent_id already exists or error:', error.message)
    }

    console.log('Database initialization completed successfully')

  } catch (error) {
    console.error('Failed to initialize database:', error)
  } finally {
    await client.close()
  }
}

// Run the initialization
initDatabase() 