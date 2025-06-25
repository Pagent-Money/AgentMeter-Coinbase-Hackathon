# Database Documentation

## Overview

This project uses Supabase as its backend database. The main tables managed are:

- `projects`
- `metering_events`
- `billing_records`
- `meter`

Additionally, there is a stored procedure (RPC) called `get_metering_stats`.

---

## Tables

### 1. `projects`

**Purpose:**  
Stores information about each project.

**Likely Fields:**
- `id` (primary key)
- `name`
- `description`
- `created_at`
- `updated_at`
- (other project-specific fields)

**Helper Functions:**
- `createProject(projectData)`
- `getProject(projectId)`
- `getAllProjects()`
- `updateProject(projectId, updateData)`
- `deleteProject(projectId)`

---

### 2. `metering_events`

**Purpose:**  
Tracks usage or metering events for each project.

**Likely Fields:**
- `id` (primary key)
- `project_id` (foreign key to `projects`)
- `agent_id`
- `user_id`
- `event_type`
- `timestamp`
- (other event-specific fields)

**Helper Functions:**
- `createMeteringEvent(eventData)`
- `getMeteringEvents(projectId, filters = {})`
  - Filters: `agent_id`, `user_id`, `event_type`, `start_date`, `end_date`, `limit`
- `getMeteringStats(projectId, timeframe = '30 days')` (calls the stored procedure)

---

### 3. `billing_records`

**Purpose:**  
Stores billing information for each project.

**Likely Fields:**
- `id` (primary key)
- `project_id` (foreign key to `projects`)
- `period_start`
- `period_end`
- `amount`
- `status`
- `created_at`
- `updated_at`
- (other billing-specific fields)

**Helper Functions:**
- `createBillingRecord(billingData)`
- `getBillingRecords(projectId)`
- `updateBillingRecord(recordId, updateData)`

---

### 4. `meter`

**Purpose:**  
Tracks per-user metering thresholds and usage for each project. Used to enforce usage limits and reset usage after payment.

**Likely Fields:**
- `id` (primary key)
- `project_id` (foreign key to `projects`)
- `user_id`
- `threshold_amount` (number, the allowed usage before payment is required)
- `current_usage` (number, the user's current usage)
- `last_reset_at` (timestamp, when the usage was last reset)
- `updated_at` (timestamp, last update)
- (other meter-specific fields)

**Helper Functions:**
- `getUserMeter(projectId, userId)`
- `setUserMeter(projectId, userId, amount)`
- `incrementUserMeterUsage(projectId, userId, amount)`
- `resetUserMeter(projectId, userId)`

---

## Stored Procedures

### `get_metering_stats`

**Purpose:**  
Returns metering statistics for a given project and timeframe.

**Parameters:**
- `p_project_id`
- `p_timeframe` (default: `'30 days'`)

---

## Usage Example

All database operations are available via the `dbHelpers` object. Example usage:

```js
import { dbHelpers } from './service/config/supabase.js';

// Create a new project
const project = await dbHelpers.createProject({ name: 'My Project' });

// Get all projects
const projects = await dbHelpers.getAllProjects();

// Log metering events for a project
const events = await dbHelpers.getMeteringEvents(project.id, { event_type: 'api_call' });

// Get billing records
const billing = await dbHelpers.getBillingRecords(project.id);
```

---

## Environment Variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

These must be set in your environment or in `service/.env`.

---

## Notes

- All helper functions throw errors if the database operation fails.
- Timestamps are managed in ISO string format.
- The code expects the Supabase tables and stored procedures to be set up as described above.

---

## API Testing Examples with cURL

### Projects API

#### Create a Project
```bash
curl -X POST 'https://YOUR_SUPABASE_URL/rest/v1/projects' \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"name": "My Test Project", "description": "A test project"}'
```

#### Get All Projects
```bash
curl 'https://YOUR_SUPABASE_URL/rest/v1/projects?select=*' \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY"
```

#### Get Single Project
```bash
curl 'https://YOUR_SUPABASE_URL/rest/v1/projects?id=eq.YOUR_PROJECT_ID&select=*' \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY"
```

### Metering Events API

#### Create Metering Event
```bash
curl -X POST 'https://YOUR_SUPABASE_URL/rest/v1/metering_events' \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "project_id": "YOUR_PROJECT_ID",
    "agent_id": "agent123",
    "user_id": "user123",
    "event_type": "api_call",
    "timestamp": "2024-03-21T00:00:00Z"
  }'
```

#### Get Metering Events for a Project
```bash
curl 'https://YOUR_SUPABASE_URL/rest/v1/metering_events?project_id=eq.YOUR_PROJECT_ID&select=*' \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY"
```

#### Get Metering Stats (RPC)
```bash
curl -X POST 'https://YOUR_SUPABASE_URL/rest/v1/rpc/get_metering_stats' \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "p_project_id": "YOUR_PROJECT_ID",
    "p_timeframe": "30 days"
  }'
```

### Billing Records API

#### Create Billing Record
```bash
curl -X POST 'https://YOUR_SUPABASE_URL/rest/v1/billing_records' \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "project_id": "YOUR_PROJECT_ID",
    "period_start": "2024-03-01T00:00:00Z",
    "period_end": "2024-03-31T23:59:59Z",
    "amount": 100.00,
    "status": "pending"
  }'
```

#### Get Billing Records for a Project
```bash
curl 'https://YOUR_SUPABASE_URL/rest/v1/billing_records?project_id=eq.YOUR_PROJECT_ID&select=*' \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY"
```

---

**Note:**
- Replace `YOUR_SUPABASE_URL` with your actual Supabase project URL
- Replace `YOUR_SUPABASE_SERVICE_ROLE_KEY` with your Supabase service role key
- Replace `YOUR_PROJECT_ID` with an actual project ID when testing
- Adjust the request bodies (`-d` parameter) according to your actual data needs
- These examples use the service role key for demonstration. For production use, you might want to use service role key or user JWT tokens depending on your security requirements. 