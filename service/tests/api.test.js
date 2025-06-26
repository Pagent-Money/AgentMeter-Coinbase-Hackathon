const http = require('http');
const fetch = require('cross-fetch');

// Test configuration
const SERVICE_URL = process.env.SERVICE_URL || 'http://localhost:4021';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test data
let testProject = null;
let testProjectSecretKey = null;

// Helper function to make API requests
async function makeRequest(method, path, body = null, headers = {}) {
  const url = `${SERVICE_URL}${path}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.json();
    
    return {
      status: response.status,
      data: responseData,
      headers: response.headers
    };
  } catch (error) {
    console.error(`Request failed: ${method} ${url}`, error.message);
    throw error;
  }
}

// Test helper to wait for service to be ready
async function waitForService(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await makeRequest('GET', '/health');
      if (response.status === 200) {
        console.log('✅ Service is ready');
        return true;
      }
    } catch (error) {
      // Service not ready yet
    }
    
    console.log(`⏳ Waiting for service... (attempt ${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Service did not become ready within timeout period');
}

// Test suite for Service API
async function runTests() {
  console.log('🚀 Starting AgentMeter Service API Tests');
  console.log(`📍 Testing service at: ${SERVICE_URL}`);
  
  let testsPassed = 0;
  let testsFailed = 0;

  // Helper function to run a test
  async function runTest(testName, testFn) {
    console.log(`\n🔍 Running test: ${testName}`);
    try {
      await testFn();
      console.log(`✅ ${testName} - PASSED`);
      testsPassed++;
    } catch (error) {
      console.error(`❌ ${testName} - FAILED:`, error.message);
      testsFailed++;
    }
  }

  try {
    // Wait for service to be ready
    await waitForService();

    // Test 1: Health Check
    await runTest('Health Check', async () => {
      const response = await makeRequest('GET', '/health');
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      if (!response.data.status || response.data.status !== 'ok') {
        throw new Error('Health check failed - status is not ok');
      }
    });

    // Test 2: Create Project
    await runTest('Create Project', async () => {
      const projectData = {
        name: 'Test Project API Unit Test',
        description: 'Test project for API unit testing'
      };

      const response = await makeRequest('POST', '/api/project/create', projectData);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }

      if (!response.data.success) {
        throw new Error('Project creation failed');
      }

      if (!response.data.project || !response.data.project.id) {
        throw new Error('Project ID not returned');
      }

      if (!response.data.project.secret_key) {
        throw new Error('Project secret key not returned');
      }

      // Store test project data for later tests
      testProject = response.data.project;
      testProjectSecretKey = response.data.project.secret_key;
      console.log(`📝 Created test project: ${testProject.id}`);
    });

    // Test 3: Get Project by ID
    await runTest('Get Project by ID', async () => {
      const response = await makeRequest('GET', `/api/project/load?id=${testProject.id}`);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      if (!response.data.success || !response.data.project) {
        throw new Error('Failed to load project');
      }

      if (response.data.project.id !== testProject.id) {
        throw new Error('Project ID mismatch');
      }
    });

    // Test 4: List All Projects
    await runTest('List All Projects', async () => {
      const response = await makeRequest('GET', '/api/projects');
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      if (!response.data.success || !Array.isArray(response.data.projects)) {
        throw new Error('Failed to list projects or projects is not an array');
      }

      // Find our test project in the list
      const foundProject = response.data.projects.find(p => p.id === testProject.id);
      if (!foundProject) {
        throw new Error('Test project not found in project list');
      }
    });

    // Test 5: Update Project
    await runTest('Update Project', async () => {
      const updateData = {
        name: 'Updated Test Project',
        description: 'Updated description for testing'
      };

      const response = await makeRequest('PUT', `/api/project/${testProject.id}`, updateData);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      if (!response.data.success) {
        throw new Error('Project update failed');
      }
    });

    // Test 6: Create Metering Event (requires authentication)
    await runTest('Create Metering Event', async () => {
      const eventData = {
        project_id: testProject.id,
        agent_id: 'test-agent-123',
        user_id: 'test-user-456',
        event_type: 'api_call',
        api_calls: 1,
        tokens_in: 100,
        tokens_out: 50
      };

      const headers = {
        'Authorization': `Bearer ${testProjectSecretKey}`,
        'X-Project-ID': testProject.id
      };

      const response = await makeRequest('POST', '/api/meter/event', eventData, headers);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }

      if (!response.data.success) {
        throw new Error('Metering event creation failed');
      }

      if (!response.data.event || !response.data.event.id) {
        throw new Error('Event ID not returned');
      }
    });

    // Test 7: List Metering Events (requires authentication)
    await runTest('List Metering Events', async () => {
      const headers = {
        'Authorization': `Bearer ${testProjectSecretKey}`,
        'X-Project-ID': testProject.id
      };

      const response = await makeRequest('GET', `/api/meter/events?project_id=${testProject.id}`, null, headers);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }

      if (!response.data.success || !Array.isArray(response.data.events)) {
        throw new Error('Failed to list metering events or events is not an array');
      }

      // Should have at least one event from the previous test
      if (response.data.events.length === 0) {
        throw new Error('No metering events found');
      }
    });

    // Test 8: Get Metering Stats (requires authentication)
    await runTest('Get Metering Stats', async () => {
      const headers = {
        'Authorization': `Bearer ${testProjectSecretKey}`,
        'X-Project-ID': testProject.id
      };

      const response = await makeRequest('GET', `/api/meter/stats?project_id=${testProject.id}`, null, headers);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }

      if (!response.data.success || !response.data.stats) {
        throw new Error('Failed to get metering stats');
      }

      if (!response.data.stats.summary) {
        throw new Error('Stats summary not returned');
      }
    });

    // Test 9: Get Billing Records
    await runTest('Get Billing Records', async () => {
      const response = await makeRequest('GET', `/api/billing/records?project_id=${testProject.id}`);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      if (!response.data.success || !Array.isArray(response.data.records)) {
        throw new Error('Failed to get billing records or records is not an array');
      }

      // Billing records may be empty, that's OK
    });

    // Test 10: Get User Meter Usage
    await runTest('Get User Meter Usage', async () => {
      const response = await makeRequest('GET', `/api/meter/usage?project_id=${testProject.id}&user_id=test-user-456`);
      
      // User meter might not exist yet, so we expect either 200 or 404
      if (response.status !== 200 && response.status !== 404) {
        throw new Error(`Expected status 200 or 404, got ${response.status}`);
      }

      if (response.status === 200 && !response.data.success) {
        throw new Error('Failed to get user meter usage');
      }
    });

    // Test 11: Authentication Tests - Invalid Secret Key
    await runTest('Authentication - Invalid Secret Key', async () => {
      const eventData = {
        project_id: testProject.id,
        agent_id: 'test-agent-123',
        user_id: 'test-user-456',
        event_type: 'api_call',
        api_calls: 1
      };

      const headers = {
        'Authorization': 'Bearer invalid-secret-key',
        'X-Project-ID': testProject.id
      };

      const response = await makeRequest('POST', '/api/meter/event', eventData, headers);
      
      if (response.status !== 401) {
        throw new Error(`Expected status 401 (Unauthorized), got ${response.status}`);
      }
    });

    // Test 12: Authentication Tests - Missing Headers
    await runTest('Authentication - Missing Headers', async () => {
      const eventData = {
        project_id: testProject.id,
        agent_id: 'test-agent-123',
        user_id: 'test-user-456',
        event_type: 'api_call',
        api_calls: 1
      };

      const response = await makeRequest('POST', '/api/meter/event', eventData);
      
      if (response.status !== 401) {
        throw new Error(`Expected status 401 (Unauthorized), got ${response.status}`);
      }
    });

    // Test 13: Chat API
    await runTest('Chat API', async () => {
      const chatData = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello!' }
        ]
      };

      const response = await makeRequest('POST', '/chat', chatData);
      
      // Chat API may fail if OpenAI API key is not configured, that's acceptable
      if (response.status === 401) {
        console.log('⚠️  Chat API test skipped - OpenAI API key not configured');
        return;
      }

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }

      if (!response.data.success || !response.data.response) {
        throw new Error('Chat API failed to return response');
      }
    });

    // Test 14: Search API
    await runTest('Search API', async () => {
      const response = await makeRequest('GET', '/search?query=hello');
      
      // Search API may fail if OpenAI API key is not configured, that's acceptable
      if (response.status === 401) {
        console.log('⚠️  Search API test skipped - OpenAI API key not configured');
        return;
      }

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }

      if (!response.data.success || !response.data.response) {
        throw new Error('Search API failed to return response');
      }
    });

    // Test 15: Error Handling - Invalid Project ID
    await runTest('Error Handling - Invalid Project ID', async () => {
      const response = await makeRequest('GET', '/api/project/load?id=invalid-project-id');
      
      if (response.status !== 404) {
        throw new Error(`Expected status 404, got ${response.status}`);
      }
    });

    // Test 16: Validation - Missing Required Fields
    await runTest('Validation - Missing Required Fields', async () => {
      const response = await makeRequest('POST', '/api/project/create', {});
      
      if (response.status !== 400) {
        throw new Error(`Expected status 400 (Bad Request), got ${response.status}`);
      }
    });

    // Cleanup: Delete Test Project
    await runTest('Cleanup - Delete Test Project', async () => {
      const response = await makeRequest('DELETE', `/api/project/${testProject.id}`);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      if (!response.data.success) {
        throw new Error('Project deletion failed');
      }

      console.log(`🗑️  Cleaned up test project: ${testProject.id}`);
    });

    // Print summary
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

    if (testsFailed > 0) {
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    }

  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, makeRequest, waitForService }; 