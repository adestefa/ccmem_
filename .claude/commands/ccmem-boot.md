# CCMem Boot

Boot up development context for specific story work

## Description

This command loads focused development context for a specific story, including all related tasks, risks, landmines, and gold standards. Perfect for starting focused development work on a particular feature or story.

## Usage

```
/ccmem-boot <storyId>
```

## Parameters

- `storyId` (required): The ID of the story to boot up context for

## What it does

1. **Story Context Loading**:
   - Loads complete story details and objectives
   - Shows story progress and completion status
   - Provides business context and requirements
   - Displays story priority and timeline information

2. **Task Breakdown**:
   - Lists all tasks for the story with current status
   - Shows task dependencies and relationships
   - Provides task-specific context and requirements
   - Includes task completion history and patterns

3. **Risk Assessment**:
   - Identifies risks specific to this story type
   - Shows related landmines from similar work
   - Provides context on past failures and solutions
   - Highlights potential problem areas to watch

4. **Success Pattern Guidance**:
   - Shows relevant gold standard implementations
   - Provides examples of successful approaches
   - Suggests proven patterns for similar work
   - Includes commit references and file patterns

5. **Work Preparation**:
   - Suggests optimal task ordering and approach
   - Provides file and directory context
   - Shows related architectural considerations
   - Prepares development environment context

## When to Use

- **Story Kickoff**: Beginning work on a new story or feature
- **Context Switch**: Switching from one story to another  
- **Team Handoff**: When picking up someone else's story work
- **Story Review**: Understanding complete story scope and status
- **Planning**: Breaking down story work and identifying risks

## Implementation

This command calls the CCMem MCP tool `ccmem-boot` with the specified story ID.

## Example Usage

```
/ccmem-boot 5
```

## Example Output

```
🚀 CCMem Boot - Story #5 Context Loaded

## Story Overview
📖 Story #5: "Implement user authentication system with JWT tokens"
📅 Created: 2024-01-15 | Status: In Progress (3/5 tasks completed)
💼 Business Goal: Secure user login with session management

## Task Breakdown
✅ Task #12: Design user database schema (COMPLETED)
✅ Task #13: Implement JWT authentication middleware (COMPLETED)  
✅ Task #14: Create login/logout API endpoints (COMPLETED)
🔄 Task #15: Add frontend authentication forms (IN PROGRESS)
⏳ Task #16: Implement password reset flow (PENDING)

## ⚠️ Related Risks & Landmines
- Authentication session handling issues (Landmine #3, #7)
- JWT secret configuration problems in production
- Password validation complexity requirements

## 🏆 Success Patterns (Gold Standards)
- Session middleware implementation (Task #8, commit abc123)
- Secure password hashing patterns (Task #4, commit def456)

## 🎯 Recommended Next Actions
1. Focus on Task #15 - frontend authentication forms
2. Check files: app/routes/auth.py, app/templates/login.html
3. Reference gold standard session patterns from Task #8
4. Watch for JWT configuration landmines during deployment

Ready to continue story development! 🔥
```

This provides complete story-focused context for efficient development work.