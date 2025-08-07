# CCMem Dashboard Data

Get real-time dashboard data for live kanban updates

## Description

This command retrieves current dashboard data from the SQLite database for real-time visualization. It supports partial refresh types to optimize performance and reduce data transfer.

## Usage

```
/ccmem-dashboard-data [refresh_type]
```

## Parameters

- `refresh_type` (optional): Type of data to refresh
  - `full` - Complete dashboard data (default)
  - `metrics` - Just the metrics cards
  - `kanban` - Just the kanban board data
  - `backlog` - Just the backlog items

## Examples

### Full Dashboard Refresh
```bash
/ccmem-dashboard-data
/ccmem-dashboard-data full
```
**Returns**: Complete dashboard data including metrics, kanban, and backlog

### Metrics Only
```bash
/ccmem-dashboard-data metrics
```
**Returns**: Story counts, task counts, defect counts for dashboard cards

### Kanban Board Only
```bash
/ccmem-dashboard-data kanban
```
**Returns**: Tasks organized by status (queue, development, QA, done) with agent information

### Backlog Only
```bash
/ccmem-dashboard-data backlog
```
**Returns**: Backlog items with Prime analysis and risk scoring

## Response Format

```json
{
  "success": true,
  "data": {
    "metrics": {
      "total_stories": 3,
      "backlog_items": 5,
      "queue_tasks": 2,
      "dev_tasks": 1,
      "qa_tasks": 0,
      "done_tasks": 7
    },
    "kanban": {
      "queue": [...],
      "development": [...],
      "qa": [...], 
      "done": [...]
    },
    "backlog": [...]
  },
  "timestamp": "2025-08-07T20:30:00.000Z"
}
```

## Integration

This command is automatically called by:
- Dashboard auto-refresh (every 5 seconds)
- Manual refresh button clicks
- After story/task creation or updates
- Prime backlog grooming completion

## Implementation

Calls the CCMem MCP tool `ccmem-dashboard-data` which:
- Queries SQLite database for current state
- Joins tables to provide complete task/story context
- Includes agent session information for real-time status
- Returns formatted JSON for dashboard consumption