# AgentMeter API Documentation

## Overview

This document describes the available API endpoints for interacting with the AgentMeter service. The API provides functionality for managing projects, tracking metering events, and handling billing records.

## Authentication

All API requests require authentication using your project's secret key. Include it in the request headers:

```bash
Authorization: Bearer YOUR_PROJECT_SECRET_KEY
```

## Base URL

```
https://api.agentmeter.money
```

## API Endpoints

### Projects

#### Create a Project
```http
POST /projects
```

**Request Body:**
```json
{
  "name": "My Project",
  "description": "Optional project description"
}
```

**Response:**
```json
{
  "id": "proj_123",
  "name": "My Project",
  "description": "Optional project description",
  "created_at": "2024-03-21T00:00:00Z",
  "updated_at": "2024-03-21T00:00:00Z"
}
```

#### Get a Project
```http
GET /projects/:projectId
```

**Response:**
```json
{
  "id": "proj_123",
  "name": "My Project",
  "description": "Optional project description",
  "created_at": "2024-03-21T00:00:00Z",
  "updated_at": "2024-03-21T00:00:00Z"
}
```

#### List All Projects
```http
GET /projects
```

**Response:**
```json
[
  {
    "id": "proj_123",
    "name": "My Project",
    "description": "Optional project description",
    "created_at": "2024-03-21T00:00:00Z",
    "updated_at": "2024-03-21T00:00:00Z"
  }
]
```

#### Update a Project
```http
PATCH /projects/:projectId
```

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "id": "proj_123",
  "name": "Updated Project Name",
  "description": "Updated description",
  "created_at": "2024-03-21T00:00:00Z",
  "updated_at": "2024-03-21T01:00:00Z"
}
```

#### Delete a Project
```http
DELETE /projects/:projectId
```

**Response:**
```json
{
  "success": true
}
```

### Metering Events

#### Create a Metering Event
```http
POST /api/meter/event
```

**Request Body:**
```json
{
  "project_id": "proj_123",
  "agent_id": "agent_456",
  "user_id": "user_789",
  "event_type": "api_call",
  "api_calls": 1,
  "tokens_in": 100,
  "tokens_out": 50
}
```

**Response:**
```json
{
  "id": "evt_123",
  "project_id": "proj_123",
  "agent_id": "agent_456",
  "user_id": "user_789",
  "event_type": "api_call",
  "api_calls": 1,
  "tokens_in": 100,
  "tokens_out": 50,
  "request_cost": 0.001,
  "token_cost": 0.002,
  "total_cost": 0.003,
  "timestamp": "2024-03-21T00:00:00Z"
}
```

#### List Metering Events
```http
GET /api/meter/events
```

**Query Parameters:**
- `project_id` (required): The project ID to fetch events for
- `agent_id` (optional): Filter by agent ID
- `user_id` (optional): Filter by user ID
- `event_type` (optional): Filter by event type
- `start_date` (optional): Filter events after this date (ISO format)
- `end_date` (optional): Filter events before this date (ISO format)
- `limit` (optional): Maximum number of events to return

**Response:**
```json
[
  {
    "id": "evt_123",
    "project_id": "proj_123",
    "agent_id": "agent_456",
    "user_id": "user_789",
    "event_type": "api_call",
    "api_calls": 1,
    "tokens_in": 100,
    "tokens_out": 50,
    "request_cost": 0.001,
    "token_cost": 0.002,
    "total_cost": 0.003,
    "timestamp": "2024-03-21T00:00:00Z"
  }
]
```

#### Get Metering Statistics
```http
GET /api/meter/stats
```

**Query Parameters:**
- `project_id` (required): The project ID to fetch stats for
- `timeframe` (optional): Time period for stats (default: "30 days")

**Response:**
```json
{
  "total_api_calls": 1000,
  "total_tokens_in": 50000,
  "total_tokens_out": 25000,
  "total_request_cost": 1.00,
  "total_token_cost": 2.00,
  "total_cost": 3.00
}
```

### Billing Records

#### Create a Billing Record
```http
POST /billing-records
```

**Request Body:**
```json
{
  "project_id": "proj_123",
  "period_start": "2024-03-01T00:00:00Z",
  "period_end": "2024-03-31T23:59:59Z",
  "amount": 100.00,
  "status": "pending"
}
```

**Response:**
```json
{
  "id": "bill_123",
  "project_id": "proj_123",
  "period_start": "2024-03-01T00:00:00Z",
  "period_end": "2024-03-31T23:59:59Z",
  "amount": 100.00,
  "status": "pending",
  "created_at": "2024-03-21T00:00:00Z",
  "updated_at": "2024-03-21T00:00:00Z"
}
```

#### List Billing Records
```http
GET /billing-records
```

**Query Parameters:**
- `project_id` (required): The project ID to fetch billing records for

**Response:**
```json
[
  {
    "id": "bill_123",
    "project_id": "proj_123",
    "period_start": "2024-03-01T00:00:00Z",
    "period_end": "2024-03-31T23:59:59Z",
    "amount": 100.00,
    "status": "pending",
    "created_at": "2024-03-21T00:00:00Z",
    "updated_at": "2024-03-21T00:00:00Z"
  }
]
```

#### Update a Billing Record
```http
PATCH /billing-records/:recordId
```

**Request Body:**
```json
{
  "status": "paid",
  "amount": 95.00
}
```

**Response:**
```json
{
  "id": "bill_123",
  "project_id": "proj_123",
  "period_start": "2024-03-01T00:00:00Z",
  "period_end": "2024-03-31T23:59:59Z",
  "amount": 95.00,
  "status": "paid",
  "created_at": "2024-03-21T00:00:00Z",
  "updated_at": "2024-03-21T01:00:00Z"
}
```

### Usage Meter

#### Get User Meter
```http
GET /api/meter/usage
```

**Query Parameters:**
- `project_id` (required): The project ID
- `user_id` (required): The user ID

**Response:**
```json
{
  "project_id": "proj_123",
  "user_id": "user_789",
  "threshold_amount": 100.00,
  "current_usage": 45.50,
  "last_reset_at": "2024-03-01T00:00:00Z",
  "updated_at": "2024-03-21T00:00:00Z"
}
```

#### Set User Meter
```http
PUT /api/meter
```

**Request Body:**
```json
{
  "project_id": "proj_123",
  "user_id": "user_789",
  "threshold_amount": 100.00
}
```

**Response:**
```json
{
  "project_id": "proj_123",
  "user_id": "user_789",
  "threshold_amount": 100.00,
  "current_usage": 0,
  "last_reset_at": "2024-03-21T00:00:00Z",
  "updated_at": "2024-03-21T00:00:00Z"
}
```

#### Increment User Meter Usage
```http
POST /api/meter/increment
```

**Request Body:**
```json
{
  "project_id": "proj_123",
  "user_id": "user_789",
  "amount": 10.50
}
```

**Response:**
```json
{
  "project_id": "proj_123",
  "user_id": "user_789",
  "threshold_amount": 100.00,
  "current_usage": 56.00,
  "last_reset_at": "2024-03-01T00:00:00Z",
  "updated_at": "2024-03-21T00:00:00Z"
}
```

#### Reset User Meter
```http
POST /api/meter/reset
```

**Request Body:**
```json
{
  "project_id": "proj_123",
  "user_id": "user_789"
}
```

**Response:**
```json
{
  "project_id": "proj_123",
  "user_id": "user_789",
  "threshold_amount": 100.00,
  "current_usage": 0,
  "last_reset_at": "2024-03-21T00:00:00Z",
  "updated_at": "2024-03-21T00:00:00Z"
}
```

## Error Responses

When an error occurs, the API will return an appropriate HTTP status code and a JSON response with error details:

```json
{
  "error": {
    "code": "error_code",
    "message": "A human-readable error message",
    "details": {} // Additional error details if available
  }
}
```

Common HTTP status codes:
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

## Rate Limits

The API has rate limits to ensure fair usage:
- 100 requests per minute per IP address
- 1000 requests per hour per project
- Metering events have a higher limit of 1000 requests per minute

When rate limited, the API will return a 429 status code with headers indicating when you can retry:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1621436400
```

## SDK Example

Here's an example of using the official Node.js SDK:

```javascript
const AgentMeter = require('agentmeter');

const meter = new AgentMeter({
  projectId: 'YOUR_PROJECT_ID',
  secretKey: 'YOUR_PROJECT_SECRET_KEY',
  agentId: 'YOUR_AGENT_ID'
});

// Log a metering event
await meter.logEvent({
  userId: 'user_123',
  apiCalls: 1,
  tokensIn: 100,
  tokensOut: 50
});

// Check user meter
const userMeter = await meter.getUserMeter('user_123');
console.log('Current usage:', userMeter.currentUsage);
```

## Support

For support or questions about the API, please:
- Email: support@agentmeter.com
- Documentation: https://docs.agentmeter.com
- Status Page: https://status.agentmeter.com 