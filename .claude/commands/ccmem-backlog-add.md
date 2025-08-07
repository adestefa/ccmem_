# CCMem Backlog Add

Add new story to backlog via dashboard form

## Description

This command allows users to add new stories directly to the backlog through the dashboard interface. Stories added to the backlog are isolated from Prime's active work and await risk assessment and user approval before becoming active stories.

## Usage

```
/ccmem-backlog-add "title" "description" "success_criteria" [options]
```

## Parameters

- `title` (required): Story title/name
- `description` (required): Detailed story description
- `success_criteria` (required): Measurable acceptance criteria
- `priority` (optional): Priority level 1-5 (default: 3)
- `business_value` (optional): Business value 1-10 (default: 5)
- `estimated_complexity` (optional): simple|moderate|complex|high_risk (default: moderate)

## Examples

### Simple Story
```bash
/ccmem-backlog-add "User Profile Page" "Create a user profile page where users can view and edit their personal information" "- User can view their current profile information\n- User can edit and save profile changes\n- Changes are validated and persisted to database"
```

### Complex Story with Full Options
```bash
/ccmem-backlog-add "Advanced Search Feature" "Implement advanced search functionality with filters, sorting, and pagination" "- Users can search with multiple filter criteria\n- Results are properly paginated\n- Search performance is under 500ms" 2 8 complex
```

### High Priority Critical Feature
```bash
/ccmem-backlog-add "Security Vulnerability Fix" "Fix critical security vulnerability in user authentication" "- Vulnerability is completely resolved\n- No new security issues introduced\n- All existing functionality remains intact" 1 9 high_risk
```

## Story Properties

### Priority Levels
- **1**: Critical - Must be implemented immediately
- **2**: High - Important for next release
- **3**: Medium - Standard priority (default)
- **4**: Low - Nice to have feature
- **5**: Nice-to-have - Future consideration

### Business Value Scale (1-10)
- **1-3**: Low business impact
- **4-6**: Medium business impact (default: 5)
- **7-8**: High business impact
- **9-10**: Critical business impact

### Complexity Estimates
- **simple**: Straightforward implementation, low risk
- **moderate**: Standard complexity, manageable risk (default)
- **complex**: High complexity, requires careful planning
- **high_risk**: Dangerous operations, breaking changes possible

## Success Criteria Format

Write success criteria as specific, testable statements:

### Good Examples
```
- User can successfully log in with valid credentials
- Login attempt with invalid credentials shows appropriate error
- User session persists across browser refreshes
- Password reset email is sent within 30 seconds
```

### Poor Examples
```
- Login works well
- User experience is improved
- System is more secure
```

## Response Format

```json
{
  "success": true,
  "backlog_id": 42,
  "message": "Story 'User Profile Page' added to backlog with ID 42",
  "priority": 3,
  "business_value": 5,
  "estimated_complexity": "moderate"
}
```

## Workflow Integration

### After Story Addition
1. **Story appears in backlog** - Visible in dashboard backlog section
2. **Awaits Prime analysis** - Prime will analyze when workload is low
3. **Risk assessment** - Prime evaluates complexity and historical patterns
4. **User approval** - Prime recommends high-value stories for user confirmation
5. **Story creation** - Approved backlog items become active stories

### Prime's Analysis Process
- **Risk keyword detection** - Scans for dangerous operations
- **Historical landmine matching** - Checks against past failures
- **Complexity scoring** - Evaluates technical difficulty
- **Value/risk ratio calculation** - Determines recommendation priority

## Best Practices

### Writing Effective Stories
1. **Clear titles** - Descriptive and specific
2. **Detailed descriptions** - Provide context and requirements
3. **Measurable criteria** - Define what "done" looks like
4. **Appropriate complexity** - Don't underestimate difficulty

### Success Criteria Guidelines
1. **Use "User can..." format** for user-facing features
2. **Include performance requirements** where relevant
3. **Specify error handling** expectations
4. **Define validation rules** for data input

### Priority and Value Assessment
1. **Be realistic** about business value scores
2. **Consider dependencies** when setting priority
3. **Account for technical debt** in complexity estimates
4. **Balance quick wins** with strategic initiatives

## Integration

This command:
- Stores stories in isolated `backlog` table
- Does not disturb Prime's active work on stories/tasks
- Triggers Prime analysis when workload permits
- Provides data for dashboard backlog visualization
- Enables Prime's recommendation system for optimal work selection

Stories remain in backlog until user approves Prime's recommendation to convert them into active work stories.