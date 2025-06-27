# AgentMeter Service Tests

This directory contains unit tests and integration tests for the AgentMeter service backend.

## Test Structure

### Test Files

| File | Purpose | npm Script |
|------|---------|------------|
| `api.test.js` | Original API tests for basic functionality | `npm run test:service` |
| `api.test.basic.js` | Basic tests without database requirements | `npm run test:service:basic` |
| `api.test.updated.js` | Tests for newly added endpoints | `npm run test:service:updated` |
| `test-commercial-accounts.js` | Original commercial account test (old) | `npm run test:commercial` |
| `commercial-accounts.test.js` | New comprehensive commercial account tests | `npm run test:commercial:new` |
| `integration-test.js` | Full integration tests with account creation | `npm run test:integration` |

### Test Commands

#### Individual Tests (require service to be running)
```bash
npm run test:service           # Run original API tests
npm run test:service:basic     # Run basic tests
npm run test:service:updated   # Run updated endpoint tests
npm run test:commercial        # Run old commercial account tests
npm run test:commercial:new    # Run new commercial account tests
npm run test:integration       # Run integration tests
```

#### Tests with Auto-Server Startup
```bash
npm run test:service:with-server           # API tests + auto server
npm run test:commercial:with-server        # Commercial tests + auto server
npm run test:commercial:new:with-server    # New commercial tests + auto server
npm run test:integration:with-server       # Integration tests + auto server
```

## Test Results Summary

### Latest Test Results (Commercial Account System)

**Pass Rate: 70.6% (12/17 tests)**

#### ✅ Working Features
- Health endpoint
- Commercial account registration
- Duplicate email protection
- Input validation (missing fields)
- Project creation authentication
- Legacy endpoint redirects (301 status)
- Error handling (invalid JSON, HTTP methods)

#### ❌ Issues Found
1. **Authentication Bypass**: GET `/api/projects` doesn't require authentication (returns 200 instead of 401)
2. **Database Foreign Key Errors**: Metering events fail with foreign key constraint violations
3. **Inconsistent Authentication**: Some endpoints have inconsistent authentication requirements

## Test Environment Setup

### Prerequisites
1. **Database**: Supabase instance with commercial account schema
2. **Environment Variables**: Service `.env` file with Supabase credentials
3. **Node Dependencies**: `node-fetch` for HTTP requests

### Running Tests

1. **Manual Service Start**:
   ```bash
   npm run service          # Start service on port 4021
   npm run test:commercial:new  # Run tests in another terminal
   ```

2. **Automatic Service Management**:
   ```bash
   npm run test:commercial:new:with-server  # Starts service and runs tests
   ```

## Test Data

Tests use timestamped data to avoid conflicts:
- Email format: `test{timestamp}@agentmeter.com`
- Project names include timestamps
- Unique account and project IDs

## Database Requirements

The tests require the following database schema:
- `commercial_accounts` table
- `projects` table with account ownership
- `api_key_pairs` table
- `metering_events` table with proper foreign keys

## Test Categories

### 1. Unit Tests
- Individual function testing
- Mocked dependencies
- Fast execution

### 2. Integration Tests
- Full flow testing
- Real database interactions
- Account → Project → API Key flow

### 3. Authentication Tests
- API key validation
- Legacy secret key support
- Permission checking
- Rate limiting

### 4. Error Handling Tests
- Invalid input validation
- Database error handling
- HTTP error responses

## Issues to Address

1. **Authentication Enforcement**: Review all protected endpoints
2. **Database Schema**: Ensure proper foreign key relationships
3. **Error Responses**: Standardize error response formats
4. **API Key Management**: Complete API key CRUD operations
5. **Account Profile Management**: Implement account profile endpoints

## Contributing

When adding new tests:
1. Use descriptive test names
2. Include both positive and negative test cases
3. Add proper error handling
4. Update this README with new test commands
5. Ensure tests can run independently 