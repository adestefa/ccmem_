# CCMem Kanban Dashboard Documentation

## Overview

**Dashboard URL**: file:///Users/corelogic/satori-dev/clients/app-kozan/ccmem-dashboard.html

**Purpose**: Visual kanban board interface for CCMem project management that displays stories, tasks, defects, and landmines in an interactive dashboard.

## Dashboard Components

### Metrics Cards (Top Row)
- **Total Projects**: Count of all stories in CCMem database
- **In Queue**: Number of tasks with status 'pending' (orange indicator)
- **In Development**: Number of tasks with status 'in_progress' (blue indicator)  
- **Completed**: Number of tasks with status 'completed' (green indicator)

### Kanban Board Columns

- **Queue Column** (Orange): Contains tasks with status 'pending' - work that is waiting to be started
- **Development Column** (Blue): Contains tasks with status 'in_progress' - work currently being developed
- **QA Column** (Purple): Manual testing and quality assurance phase - no automatic population
- **Done Column** (Green): Contains tasks with status 'completed' - finished work

### Project Details Section
- **Story Cards**: Individual project cards showing story progress
- **Progress Bars**: Visual representation of completion percentage per story
- **Task Counts**: Breakdown of pending/in-progress/completed tasks per story
- **Creation Timestamps**: When each story was created

### Add New Story Form
- **Story Description**: Text area for natural language story input
- **Auto-Generate Tasks**: Checkbox to create 3 basic tasks automatically
- **Submit Button**: Creates story in CCMem database (via API or manual workflow)

### Monitoring Panels
- **Recent Landmines**: Shows latest failures with trauma context for learning
- **Open Defects**: Displays active bugs that need attention and resolution

## Data Flow Architecture

### JSONP Approach (No CORS Issues)
- **Export Command**: python3 ccmem_export.py
- **Data File**: ccmem-data.js (JavaScript format)
- **Global Variable**: window.ccmemData contains all dashboard data
- **Loading Method**: Script tag inclusion, no fetch() required

### Database Source
- **Primary Database**: ccmem-server/ccmem.db (SQLite)
- **Export Script**: ccmem_export.py reads database and generates JSONP
- **Tables Used**: story, task, defect, landmines for complete project view

## Refresh Workflow

### Manual Refresh Process
1. **Update CCMem Data**: Use /ccmem-prime or other CCMem commands to make changes
2. **Export Data**: Run `python3 ccmem_export.py` to update ccmem-data.js
3. **Refresh Browser**: Click "Refresh" button in dashboard or reload page
4. **View Updates**: Dashboard automatically loads new data via JSONP

### Automated Refresh (Prime Integration)
- **Refresh Command**: ./refresh_dashboard.sh
- **Prime Tool**: refresh-dashboard MCP tool available
- **Browser Integration**: Opens/refreshes Brave Browser automatically
- **AppleScript Integration**: Smart tab management and focus

## Browser Integration

### Brave Browser Specific
- **Path**: /Applications/Brave Browser.app
- **URL**: file:///Users/corelogic/satori-dev/clients/app-kozan/ccmem-dashboard.html
- **Tab Management**: Script checks for existing tabs and refreshes or creates new
- **Window Focus**: Automatically brings browser to front when refreshing

### Cross-Platform Support
- **macOS**: Uses 'open -a "Brave Browser"' command
- **Linux**: Uses 'xdg-open' for browser launching
- **Windows**: Manual browser opening with file:// URL

## Task Status Mapping

### CCMem Database → Dashboard Display
- **pending** → Queue Column (Orange background)
- **in_progress** → Development Column (Blue background)  
- **completed** → Done Column (Green background)
- **Manual QA** → QA Column (Purple, not automated)

### Status Transitions
- **Queue to Development**: Update task status to 'in_progress'
- **Development to Done**: Update task status to 'completed'
- **QA Process**: Manual testing phase, no automatic status change

## Visual Design Elements

### Color Scheme (Dark Theme)
- **Background**: Dark navy (#0f172a)
- **Cards**: Darker gray (#1e293b) with subtle borders
- **Text**: White primary, gray secondary (#94a3b8)
- **Accent Colors**: Blue (#3b82f6), Orange (#f97316), Green (#22c55e), Purple (#a855f7)

### Card Components
- **Task Cards**: Compact design with title, story context, and status badge
- **Progress Indicators**: Horizontal progress bars with percentage completion
- **Status Badges**: Colored pills showing current task status
- **Timestamps**: Relative time display for context

### Responsive Layout
- **Mobile**: Single column layout
- **Tablet**: 2-column grid for metrics
- **Desktop**: Full 4-column kanban board layout
- **Large Screens**: Maximum 3-column layout for project details

## Integration Points

### CCMem Commands That Affect Dashboard
- **/ccmem-prime**: Creates stories and tasks that appear in kanban
- **/ccmem-boot**: Changes task status to in_progress (moves to Development)
- **/ccmem-dev**: Task-specific work (may change status)
- **/ccmem-list**: Command-line view of same data shown in dashboard

### Story Creation Workflow
1. **UI Form**: Enter story description in dashboard form
2. **API Integration**: Submits to CCMem database via REST API
3. **Auto-Task Generation**: Creates 3 basic tasks: Research, Implement, Test
4. **Immediate Refresh**: Dashboard updates automatically after creation
5. **Fallback Mode**: Shows CCMem Prime commands if API unavailable

## File Locations

### Dashboard Files
- **Main Dashboard**: ccmem-dashboard.html
- **Documentation**: ccmem-docs.html  
- **Data Export**: ccmem_export.py
- **JSONP Data**: ccmem-data.js (auto-generated)

### Scripts and Tools
- **Simple Launcher**: ccmem_dashboard_simple.sh
- **Full Server**: ccmem_server.py (with API)
- **Refresh Script**: refresh_dashboard.sh
- **README**: CCMEM_DASHBOARD_README.md

## Troubleshooting

### Common Issues
- **CORS Errors**: Fixed by using JSONP instead of JSON fetch
- **Data Not Loading**: Run python3 ccmem_export.py to regenerate data
- **Browser Not Opening**: Check Brave Browser installation path
- **Refresh Not Working**: Manually reload browser page after data export

### Debug Commands
- **Check Database**: sqlite3 ccmem-server/ccmem.db ".tables"  
- **Verify Data**: cat ccmem-data.js | head -20
- **Test Export**: python3 ccmem_export.py (should show summary)
- **Browser Console**: Check for JavaScript errors in developer tools

## Prime's Dashboard Knowledge

### Questions Prime Can Answer
- **"What's in the Queue column?"**: Prime knows it contains pending tasks
- **"How do I refresh the dashboard?"**: Prime knows the ./refresh_dashboard.sh command
- **"What does the progress bar show?"**: Prime understands story completion percentage
- **"Why are some tasks in Development?"**: Prime knows in_progress status meaning

### Actions Prime Can Take
- **Refresh Dashboard**: Use refresh-dashboard MCP tool
- **Analyze Current State**: Read data and provide insights
- **Explain Status**: Clarify what each column and status means
- **Guide Workflow**: Recommend next steps based on kanban state

### Prime's Learned Context
- **Visual Layout**: Understands the 4-column kanban structure
- **Data Flow**: Knows how CCMem database connects to dashboard
- **Refresh Process**: Can execute and explain the update workflow  
- **Browser Integration**: Knows how to open and manage dashboard in browser

This documentation enables Prime to become a true expert on the kanban dashboard system and provide intelligent guidance based on visual project state.