#!/usr/bin/env node

// Comprehensive unit tests for Commercial Account System
const fetch = require('node-fetch')

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4021'

// Test data
const TEST_DATA = {
  account1: {
    email: 'test1@agentmeter.com',
    full_name: 'Test User 1',
    company_name: 'Test Company 1'
  },
  account2: {
    email: 'test2@agentmeter.com',
    full_name: 'Test User 2',
    company_name: 'Test Company 2'
  },
  project: {
    name: 'Test Project',
    description: 'A test project for commercial accounts'
  }
}

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  results: []
}

// Helper functions
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  let data
  try {
    data = await response.json()
  } catch (error) {
    data = { error: 'Invalid JSON response' }
  }
  
  return { 
    status: response.status, 
    data,
    headers: response.headers
  }
}

function assert(condition, message) {
  testResults.total++
  if (condition) {
    testResults.passed++
    console.log(`✅ ${message}`)
    testResults.results.push({ status: 'PASS', message })
  } else {
    testResults.failed++
    console.log(`❌ ${message}`)
    testResults.results.push({ status: 'FAIL', message })
  }
}

function assertEquals(actual, expected, message) {
  assert(actual === expected, `${message} (expected: ${expected}, actual: ${actual})`)
}

async function testGroup(groupName, testFunction) {
  console.log(`\n🧪 ${groupName}`)
  console.log('='.repeat(50))
  try {
    await testFunction()
  } catch (error) {
    console.log(`❌ Test group failed: ${error.message}`)
    testResults.failed++
    testResults.total++
  }
}

// Test suite implementation
async function runCommercialAccountTests() {
  console.log('🚀 Commercial Account System - Unit Tests')
  console.log('='.repeat(60))

  await testGroup('1. Health Check', async () => {
    const result = await makeRequest('/health')
    assertEquals(result.status, 200, 'Health endpoint accessible')
  })

  await testGroup('2. Account Registration Tests', async () => {
    // Test 2.1: Successful account registration
    const result1 = await makeRequest('/api/accounts/register', {
      method: 'POST',
      body: JSON.stringify(TEST_DATA.account1)
    })
    
    assert(result1.status === 200, 'Account registration returns 200 status')
    assert(result1.data.success === true, 'Account registration returns success flag')
    assert(result1.data.account && result1.data.account.id, 'Account registration returns account ID')
    assertEquals(result1.data.account.email, TEST_DATA.account1.email, 'Account email matches input')

    // Test 2.2: Duplicate email registration should fail
    const result2 = await makeRequest('/api/accounts/register', {
      method: 'POST',
      body: JSON.stringify(TEST_DATA.account1)
    })
    
    assertEquals(result2.status, 409, 'Duplicate email registration returns 409 conflict')

    // Test 2.3: Missing required fields
    const result3 = await makeRequest('/api/accounts/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'incomplete@test.com' })
    })
    
    assertEquals(result3.status, 400, 'Missing required fields returns 400 bad request')
  })

  await testGroup('3. Authentication Tests', async () => {
    // Test 3.1: Unauthenticated access should fail
    const result1 = await makeRequest('/api/projects', {
      method: 'GET'
    })
    
    assertEquals(result1.status, 401, 'Unauthenticated project access returns 401')

    // Test 3.2: Invalid API key should fail
    const result2 = await makeRequest('/api/projects', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer pk_invalid_key_123'
      }
    })
    
    assertEquals(result2.status, 401, 'Invalid API key returns 401')

    // Test 3.3: Malformed API key should fail
    const result3 = await makeRequest('/api/projects', {
      method: 'GET',
      headers: {
        'Authorization': 'InvalidFormat'
      }
    })
    
    assertEquals(result3.status, 401, 'Malformed authorization header returns 401')
  })

  await testGroup('4. Project Management Tests', async () => {
    // Test 4.1: Project creation without authentication
    const result1 = await makeRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify(TEST_DATA.project)
    })
    
    assertEquals(result1.status, 401, 'Project creation requires authentication')

    // Test 4.2: Project creation with invalid API key
    const result2 = await makeRequest('/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer pk_fake_key_123'
      },
      body: JSON.stringify(TEST_DATA.project)
    })
    
    assertEquals(result2.status, 401, 'Project creation with invalid key fails')
  })

  await testGroup('5. Legacy Compatibility Tests', async () => {
    // Test 5.1: Legacy endpoint redirection
    const result1 = await makeRequest('/api/project/create', {
      method: 'POST',
      body: JSON.stringify(TEST_DATA.project)
    })
    
    assertEquals(result1.status, 301, 'Legacy project creation endpoint redirects')

    // Test 5.2: Legacy project update redirection
    const result2 = await makeRequest('/api/project/proj_test', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Name' })
    })
    
    assertEquals(result2.status, 301, 'Legacy project update endpoint redirects')
  })

  await testGroup('6. Metering Authentication', async () => {
    // Test 6.1: Create metering event without authentication
    const result1 = await makeRequest('/api/meter/event', {
      method: 'POST',
      body: JSON.stringify({
        project_id: 'proj_test',
        agent_id: 'test_agent',
        user_id: 'test_user',
        api_calls: 1
      })
    })
    
    assertEquals(result1.status, 401, 'Metering event creation requires authentication')
  })

  await testGroup('7. Error Handling Tests', async () => {
    // Test 7.1: Invalid JSON in request body
    const result1 = await makeRequest('/api/accounts/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: 'invalid json{'
    })
    
    assert(result1.status >= 400, 'Invalid JSON returns error status')

    // Test 7.2: Invalid HTTP method
    const result3 = await makeRequest('/api/accounts/register', {
      method: 'PATCH'
    })
    
    assert(result3.status === 404 || result3.status === 405, 'Invalid HTTP method returns appropriate error')
  })
}

// Print test results
function printTestResults() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST RESULTS SUMMARY')
  console.log('='.repeat(60))
  
  const passRate = testResults.total > 0 ? (testResults.passed / testResults.total * 100).toFixed(1) : 0
  
  console.log(`Total Tests: ${testResults.total}`)
  console.log(`Passed: ${testResults.passed}`)
  console.log(`Failed: ${testResults.failed}`)
  console.log(`Pass Rate: ${passRate}%`)
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:')
    testResults.results
      .filter(r => r.status === 'FAIL')
      .forEach(r => console.log(`  - ${r.message}`))
  }
  
  console.log('\n' + (testResults.failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'))
  console.log('='.repeat(60))
  
  return testResults.failed === 0
}

// Main execution
async function main() {
  try {
    console.log(`🔗 Testing against: ${BASE_URL}\n`)
    
    await runCommercialAccountTests()
    const success = printTestResults()
    
    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('❌ Test suite failed with error:', error.message)
    process.exit(1)
  }
}

// Run tests if called directly
if (require.main === module) {
  main()
}

module.exports = { runCommercialAccountTests } 