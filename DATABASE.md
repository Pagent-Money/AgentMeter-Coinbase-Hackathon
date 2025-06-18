# Database Management Features

This document describes the database management features implemented for the AgentMeter project.

## Overview

The system now includes comprehensive database management capabilities using MongoDB for storing projects and meter events. The implementation includes:

- **Project Management**: Create, read, update, and delete projects
- **Meter Events**: Record and retrieve usage data
- **Real-time Dashboard**: Live data display with Redux state management
- **API Integration**: RESTful endpoints with payment middleware

## Database Schema

### Projects Collection

```javascript
{
  id: "proj_abc123def456",           // Unique project identifier
  name: "AI Assistant Bot",          // Project name
  description: "Chatbot for customer support", // Optional description
  status: "Active",                  // Project status (Active/Paused)
  secret_key: "sk_live_...",        // API secret key
  settings: {                        // Project configuration
    requestPricing: 0.001,
    inputTokenPricing: 0.002,
    outputTokenPricing: 0.004
  },
  created: "2024-01-15",            // Creation date (YYYY-MM-DD)
  createdAt: Date,                  // MongoDB timestamp
  updatedAt: Date                   // Last update timestamp
}
```

### Meter Events Collection

```javascript
{
  project_id: "proj_abc123def456",  // Reference to project
  agent_id: "assistant-v1",         // Agent identifier
  user_id: "user_123",              // User identifier
  tokens_in: 150,                   // Input tokens
  tokens_out: 75,                   // Output tokens
  api_calls: 1,                     // Number of API calls
  timestamp: Date,                  // Event timestamp
  request_cost: 0.001,              // Cost for API requests
  token_cost: 0.005,                // Cost for tokens
  total_cost: 0.006                 // Total cost
}
```

## API Endpoints

### Project Management

- `POST /api/project/create` - Create a new project
- `GET /api/project/load` - Load a specific project
- `GET /api/projects` - List all projects
- `PUT /api/project/:id` - Update a project
- `DELETE /api/project/:id` - Delete a project

### Meter Events

- `POST /api/meter/event` - Record a meter event
- `GET /api/meter/events` - Retrieve meter events

## Setup Instructions

### 1. Database Initialization

```bash
# Initialize database collections and indexes
npm run init-db

# Seed with sample data
npm run seed

# Or run both at once
npm run setup
```

### 2. Start the Service

```bash
# Build and start the service
npm run service
```

### 3. Access the Dashboard

Navigate to the Dashboard page to:
- View all projects
- Create new projects
- Manage project settings
- View meter events and analytics
- Monitor revenue and usage

## Features

### Project Management
- **Create Projects**: Add new projects with name and description
- **Project List**: View all projects with status and creation date
- **Project Details**: View project ID, secret key, and configuration
- **Delete Projects**: Remove projects with confirmation
- **Real-time Updates**: Changes reflect immediately in the UI

### Meter Events
- **Event Recording**: Track API calls, tokens, and costs
- **Event History**: View detailed event logs
- **Analytics**: Real-time statistics and trends
- **Filtering**: Filter events by agent and time period

### Dashboard Features
- **Loading States**: Visual feedback during data operations
- **Error Handling**: Display error messages for failed operations
- **Responsive Design**: Works on desktop and mobile devices
- **Copy to Clipboard**: Easy copying of project IDs and keys

## Redux State Management

The application uses Redux for state management with the following structure:

```javascript
{
  project: {
    projects: [],           // Array of all projects
    currentProject: null,   // Currently selected project
    meterEvents: [],        // Array of meter events
    loading: false,         // Loading state
    error: null            // Error state
  }
}
```

## Environment Variables

Set the following environment variables:

```bash
MONGODB_URI=mongodb://localhost:27017/agentmeter
```

## Security Features

- **Secret Key Generation**: Automatic generation of secure API keys
- **Payment Middleware**: All API endpoints require payment
- **Input Validation**: Server-side validation of all inputs
- **Error Handling**: Comprehensive error handling and logging

## Performance Optimizations

- **Database Indexes**: Optimized queries with proper indexing
- **Pagination**: Support for limiting and offsetting results
- **Caching**: Redux state caching for better performance
- **Lazy Loading**: Load data only when needed

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure MongoDB is running
   - Check MONGODB_URI environment variable
   - Verify network connectivity

2. **Projects Not Loading**
   - Check browser console for errors
   - Verify API endpoints are accessible
   - Ensure payment middleware is configured

3. **Meter Events Not Recording**
   - Verify project_id and agent_id are provided
   - Check API response for error messages
   - Ensure database is properly initialized

### Debug Commands

```bash
# Check database connection
npm run init-db

# View database contents
mongo agentmeter --eval "db.projects.find().pretty()"

# Check service logs
npm run service:dev
```

## Future Enhancements

- **User Authentication**: Add user management and authentication
- **Advanced Analytics**: More detailed reporting and charts
- **Webhook Support**: Real-time notifications for events
- **Bulk Operations**: Support for bulk project and event operations
- **Export Features**: Export data to CSV/JSON formats 