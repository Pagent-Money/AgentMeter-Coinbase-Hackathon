import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentmeter'

async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('Connected to MongoDB')

    const db = client.db("agentmeter")

    // Seed projects
    const projectsCollection = db.collection("projects")
    const projects = [
      {
        id: 'proj_123abc',
        name: 'AI Assistant Bot',
        created: '2024-01-15',
        status: 'Active',
        secret_key: 'sk_live_abc123def456ghi789jkl012mno345pqr678stu901vwx234yzabc567def890',
        createdAt: new Date('2024-01-15')
      },
      {
        id: 'proj_456def',
        name: 'Content Generator',
        created: '2024-02-01',
        status: 'Active',
        secret_key: 'sk_live_def456ghi789jkl012mno345pqr678stu901vwx234yzabc567def890abc123',
        createdAt: new Date('2024-02-01')
      },
      {
        id: 'proj_789ghi',
        name: 'Data Analyzer',
        created: '2024-02-10',
        status: 'Paused',
        secret_key: 'sk_live_ghi789jkl012mno345pqr678stu901vwx234yzabc567def890abc123def456',
        createdAt: new Date('2024-02-10')
      }
    ]

    // Clear existing projects and insert new ones
    await projectsCollection.deleteMany({})
    await projectsCollection.insertMany(projects)
    console.log('Projects seeded successfully')

    // Seed meter events
    const eventsCollection = db.collection("meter_events")
    const events = [
      {
        id: 1,
        agent_id: 'assistant-v1',
        user_id: 'user_123',
        tokens_in: 150,
        tokens_out: 75,
        api_calls: 1,
        timestamp: '2024-02-15 14:30:22',
        request_cost: 0.001,
        token_cost: 0.005,
        total_cost: 0.006,
        createdAt: new Date('2024-02-15T14:30:22Z')
      },
      {
        id: 2,
        agent_id: 'content-gen-v2',
        user_id: 'user_456',
        tokens_in: 320,
        tokens_out: 180,
        api_calls: 1,
        timestamp: '2024-02-15 14:25:15',
        request_cost: 0.001,
        token_cost: 0.012,
        total_cost: 0.013,
        createdAt: new Date('2024-02-15T14:25:15Z')
      },
      {
        id: 3,
        agent_id: 'assistant-v1',
        user_id: 'user_789',
        tokens_in: 89,
        tokens_out: 45,
        api_calls: 1,
        timestamp: '2024-02-15 14:20:08',
        request_cost: 0.001,
        token_cost: 0.003,
        total_cost: 0.004,
        createdAt: new Date('2024-02-15T14:20:08Z')
      },
      {
        id: 4,
        agent_id: 'data-analyzer-v1',
        user_id: 'user_101',
        tokens_in: 450,
        tokens_out: 220,
        api_calls: 1,
        timestamp: '2024-02-15 14:15:30',
        request_cost: 0.001,
        token_cost: 0.018,
        total_cost: 0.019,
        createdAt: new Date('2024-02-15T14:15:30Z')
      },
      {
        id: 5,
        agent_id: 'content-gen-v2',
        user_id: 'user_202',
        tokens_in: 280,
        tokens_out: 160,
        api_calls: 1,
        timestamp: '2024-02-15 14:10:45',
        request_cost: 0.001,
        token_cost: 0.011,
        total_cost: 0.012,
        createdAt: new Date('2024-02-15T14:10:45Z')
      }
    ]

    // Clear existing events and insert new ones
    await eventsCollection.deleteMany({})
    await eventsCollection.insertMany(events)
    console.log('Meter events seeded successfully')

    console.log('Database seeding completed!')

  } catch (error) {
    console.error('Error seeding database:', error)
  } finally {
    await client.close()
  }
}

seedDatabase()
