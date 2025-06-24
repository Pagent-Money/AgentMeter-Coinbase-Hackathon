# Database Documentation

## Overview

This project uses Supabase as its backend database. The main tables managed are:

- `projects`
- `metering_events`
- `billing_records`

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