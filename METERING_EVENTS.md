# Metering Events Feature

This document describes the metering events feature that tracks API usage and calculates revenue based on project secret keys.

## Overview

The metering events system allows you to:
- Track API requests made to your AI agents
- Monitor token usage (input and output)
- Calculate revenue based on usage
- View real-time analytics in the Dashboard
- Filter events by agent, time period, and user

## Architecture

### Backend API Endpoints

#### Record Meter Event
```
POST /api/meter/event
```

**Headers:**
- `Authorization: Bearer <project_secret_key>`
- `X-Project-ID: <project_id>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "project_id": "proj_123abc",
  "agent_id": "chatbot-v1",
  "user_id": "user_001",
  "tokens_in": 150,
  "tokens_out": 300,
  "api_calls": 1
}
```

**Response:**
```json
{
  "success": true,
  "event": {
    "id": "event_id",
    "total_cost": 0.0025,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Load Meter Events
```
GET /api/meter/events?project_id=<project_id>&agent_id=<agent_id>&limit=<limit>&offset=<offset>
```

**Headers:**
- `Authorization: Bearer <project_secret_key>`
- `X-Project-ID: <project_id>`

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "id": "event_id",
      "project_id": "proj_123abc",
      "agent_id": "chatbot-v1",
      "user_id": "user_001",
      "tokens_in": 150,
      "tokens_out": 300,
      "api_calls": 1,
      "timestamp": "2024-01-15T10:30:00Z",
      "request_cost": 0.001,
      "token_cost": 0.0015,
      "total_cost": 0.0025
    }
  ]
}
```

### Pricing Model

The system uses a dual pricing model:

1. **Request-based pricing**: $0.001 per API request
2. **Token-based pricing**: 
   - Input tokens: $0.002 per 1,000 tokens
   - Output tokens: $0.004 per 1,000 tokens

**Example calculation:**
- 1 API request: $0.001
- 150 input tokens: $0.0003 (150/1000 * $0.002)
- 300 output tokens: $0.0012 (300/1000 * $0.004)
- **Total cost**: $0.0025

## Frontend Implementation

### Dashboard Features

The Dashboard provides comprehensive metering analytics:

#### 1. Real-time Statistics
- API Requests count
- Input/Output token usage
- Request and token revenue
- Total revenue
- Average cost per request/token

#### 2. Filtering Capabilities
- **Agent filtering**: View events for specific agents
- **Time filtering**: Last 1 hour, 24 hours, 7 days, 30 days, or all time
- **Auto-refresh**: Automatically update data every 30 seconds

#### 3. Top Agents Analysis
- Revenue ranking by agent
- Call count per agent
- Performance insights

#### 4. Detailed Event Log
- Complete event history
- User identification
- Cost breakdown
- Timestamp tracking

### State Management

The metering events use Redux for state management:

```javascript
// Actions
export const recordMeterEvent = createAction('meter/RECORD_EVENT')
export const loadMeterEvents = createAction('meter/LOAD_EVENTS')

// State structure
{
  meterEvents: [],
  loading: false,
  error: null
}
```

## Usage Examples

### 1. Recording a Meter Event

```javascript
import { recordMeterEvent } from 'actions/project'

// Record an event when an AI agent is used
const event = await recordMeterEvent({
  project_id: 'proj_123abc',
  agent_id: 'chatbot-v1',
  user_id: 'user_001',
  tokens_in: 150,
  tokens_out: 300,
  api_calls: 1
})
```

### 2. Loading Events in Dashboard

```javascript
import { loadMeterEvents } from 'actions/project'

// Load events for a specific project
const events = await loadMeterEvents({
  project_id: 'proj_123abc',
  limit: 100,
  agent_id: 'chatbot-v1' // optional
})
```

### 3. Test Script

Run the test script to simulate metering events:

```bash
node test-metering.js
```

Or in the browser console:
```javascript
window.runMeteringDemo()
```

## Database Schema

### Meter Events Collection

```javascript
{
  _id: ObjectId,
  project_id: String,        // Project identifier
  agent_id: String,          // Agent identifier
  user_id: String,           // User identifier
  tokens_in: Number,         // Input tokens used
  tokens_out: Number,        // Output tokens generated
  api_calls: Number,         // Number of API calls
  timestamp: Date,           // Event timestamp
  request_cost: Number,      // Cost for API requests
  token_cost: Number,        // Cost for token usage
  total_cost: Number         // Total cost
}
```

## Security

### Authentication
- All API requests require a valid project secret key
- Secret keys are generated automatically for each project
- Keys should be kept secure and not exposed in client-side code

### Rate Limiting
- Consider implementing rate limiting for production use
- Monitor usage patterns to prevent abuse

## Monitoring and Analytics

### Key Metrics to Track
1. **Revenue per agent**: Identify most profitable agents
2. **Usage patterns**: Understand peak usage times
3. **Cost per request**: Optimize pricing strategy
4. **User behavior**: Track individual user usage

### Dashboard Insights
- Real-time revenue tracking
- Agent performance comparison
- Usage trend analysis
- Cost optimization suggestions

## Best Practices

### 1. Event Recording
- Record events immediately after API calls
- Include accurate token counts
- Use consistent agent IDs
- Track user IDs for analytics

### 2. Error Handling
- Implement retry logic for failed event recordings
- Log errors for debugging
- Provide fallback mechanisms

### 3. Performance
- Use batch operations for high-volume events
- Implement caching for frequently accessed data
- Optimize database queries with proper indexing

### 4. Security
- Validate all input data
- Implement proper authentication
- Monitor for suspicious usage patterns
- Regularly rotate secret keys

## Troubleshooting

### Common Issues

1. **Events not appearing in Dashboard**
   - Check project ID and secret key
   - Verify API endpoint is accessible
   - Check browser console for errors

2. **Incorrect cost calculations**
   - Verify token counts are accurate
   - Check pricing configuration
   - Validate event data format

3. **Performance issues**
   - Implement pagination for large datasets
   - Use appropriate time filters
   - Consider data archiving for old events

### Debug Tools

1. **Browser Developer Tools**
   - Check network requests
   - Monitor Redux state
   - View console logs

2. **API Testing**
   - Use test-metering.js script
   - Test with Postman or similar tools
   - Verify response formats

## Future Enhancements

### Planned Features
1. **Advanced Analytics**
   - Predictive revenue modeling
   - Usage forecasting
   - Anomaly detection

2. **Enhanced Filtering**
   - Date range picker
   - Custom time periods
   - Advanced search

3. **Export Capabilities**
   - CSV/Excel export
   - Automated reports
   - API for external tools

4. **Real-time Notifications**
   - Usage alerts
   - Revenue milestones
   - Performance warnings 