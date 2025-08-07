# CCMem List

List stories, tasks, defects, and landmines with flexible filtering

## Description

This command provides comprehensive visibility into your project's stories, tasks, defects, and landmines. It offers multiple filtering options to help you understand project status and navigate your development work efficiently.

## Usage

```
/ccmem-list [storyId | filter]
```

## Parameters

- `storyId` (optional): Show detailed breakdown of a specific story
- `filter` (optional): Filter type - 'stories', 'tasks', 'defects', or 'landmines'

## What it does

1. **Story Listing**: 
   - Shows all stories with progress bars and completion percentages
   - Displays task counts, in-progress work, and open defects
   - Provides creation timestamps and story IDs

2. **Detailed Story View**:
   - Complete breakdown of all tasks (completed, in-progress, pending)
   - Lists all related defects with status indicators
   - Shows story creation date and progress metrics

3. **Task Overview**:
   - Groups tasks by status (completed, in-progress, pending)
   - Shows task descriptions and associated story information
   - Provides recent activity and work patterns

4. **Defect Tracking**:
   - Lists open defects that need attention
   - Shows recently resolved issues
   - Links defects to their parent stories

5. **Landmine History**:
   - Displays painful failures and lessons learned
   - Shows error contexts and attempted fixes
   - Helps avoid repeating past mistakes

## Filter Options

### Default (Stories)
```
/ccmem-list
```
Shows all stories with progress indicators and summary stats.

### Specific Story
```
/ccmem-list 5
```
Shows complete breakdown of Story #5 with all tasks and defects.

### All Tasks
```  
/ccmem-list tasks
```
Shows all tasks grouped by status across all stories.

### All Defects
```
/ccmem-list defects  
```
Shows all defects (open and recently resolved) with story context.

### Landmine History
```
/ccmem-list landmines
```
Shows all recorded failures and the lessons learned from them.

## When to Use

- **Project Overview**: Regular check-ins on overall project health
- **Planning Sessions**: Understanding current work distribution  
- **Story Focus**: Getting complete context for specific stories
- **Defect Review**: Identifying and prioritizing issues to fix
- **Learning**: Reviewing past failures to avoid repeating mistakes
- **Handoffs**: Providing complete project state to team members

## Example Output

### Story List View
```
## 📚 All Stories

**Story #3**: Implement user authentication with JWT tokens
- 📊 Progress: [████████░░] 80% (4/5 tasks)  
- 🔄 In Progress: 1 tasks
- 📅 Created: 2024-01-15 14:23:45

**Story #2**: Add responsive dashboard UI
- 📊 Progress: [██████████] 100% (3/3 tasks)
- ✅ Completed
- 📅 Created: 2024-01-10 09:15:22
```

### Detailed Story View  
```
## 📖 Story #3: Implement user authentication with JWT tokens

### 🎯 Tasks (4/5 completed)

**✅ Completed:**
- Task #8: Design authentication database schema
- Task #9: Implement login/logout API endpoints  
- Task #10: Create authentication forms UI
- Task #11: Add session management middleware

**🔄 In Progress:**  
- Task #12: Implement password reset flow

### 🐛 Defects (1 total)
- 🔴 **Defect #2** (open): Session cookies not persisting across browser restarts
```

## Integration

This command works seamlessly with other CCMem commands:
- Use story IDs with `/ccmem-boot <storyId>` to focus on specific stories
- Use task IDs with `/ccmem-dev <taskId>` for task development  
- Reference defect IDs when creating fix tasks
- Learn from landmine patterns to avoid similar failures

Perfect for maintaining project visibility and informed decision-making!