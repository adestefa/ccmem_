# CCMem Dev

Initialize context for task development work

## Description

This command loads comprehensive development context for a specific task, including implementation details, related risks, architectural considerations, and success patterns. Optimized for focused development work.

## Usage

```
/ccmem-dev <taskId>
```

## Parameters

- `taskId` (required): The ID of the task to initialize development context for

## What it does

1. **Task Development Context**:
   - Loads complete task details, requirements, and acceptance criteria
   - Shows task status, story relationship, and development history
   - Provides implementation timeline and progress tracking
   - Includes file modification history and code patterns

2. **Technical Implementation Guidance**:
   - Shows relevant architectural patterns and components
   - Provides file and directory structure context
   - Includes related code examples and implementations
   - Suggests optimal development approach and tools

3. **Risk-Aware Development**:
   - Identifies task-specific risks and potential landmines
   - Shows related failures from similar task types
   - Provides warnings about problematic patterns
   - Includes mitigation strategies and best practices

4. **Code Quality Context**:
   - Shows relevant gold standard implementations
   - Provides testing patterns and strategies
   - Includes code review checkpoints and quality gates
   - Suggests validation approaches and tools

5. **Development Environment Setup**:
   - Provides relevant configuration and environment details
   - Shows required dependencies and setup steps
   - Includes debugging and development workflow guidance
   - Prepares local development context

## When to Use

- **Task Kickoff**: Starting development work on a specific task
- **Implementation Planning**: Understanding task scope and approach
- **Code Review Prep**: Getting context before reviewing task work
- **Debugging**: When investigating task-related issues
- **Knowledge Transfer**: When taking over someone else's task work

## Implementation

This command calls the CCMem MCP tool `ccmem-dev` with the specified task ID.

## Example Usage

```
/ccmem-dev 15
```

## Example Output

```
💻 CCMem Dev - Task #15 Development Context

## Task Overview
🎯 Task #15: "Add frontend authentication forms"
📖 Story: #5 - Implement user authentication system with JWT tokens
📅 Status: In Progress | Priority: High
👤 Previous Sessions: auth-frontend-session-1, auth-forms-session-2

## Technical Implementation Context
🏗️ **Architecture**: FastAPI backend + Jinja2 templates + vanilla JS
📁 **Key Files**: 
   - app/templates/login.html, app/templates/register.html
   - app/static/js/auth.js, app/static/css/auth.css
   - app/routes/auth.py (backend endpoints already implemented)

🔧 **Required Components**:
   - Login form with email/password validation
   - Registration form with password confirmation
   - CSRF protection integration
   - JavaScript form validation and submission
   - Error message handling and display

## ⚠️ Development Risks
- **Form Validation Landmine**: Client-side validation bypass (Landmine #12)
- **CSRF Token Issues**: Missing token handling in AJAX requests (Landmine #8)  
- **Session Management**: Redirect loops after login (Landmine #15)

## 🏆 Success Patterns
- **Form Validation Pattern**: Use progressive enhancement (Gold Standard Task #9)
- **Error Handling**: Unified error display component (Gold Standard Task #11)
- **CSRF Integration**: Token injection via template (Gold Standard Task #7)

## 🔧 Development Setup
**Start Commands**: `./start.sh development` (port 8001)
**Test Commands**: `pytest app/tests/test_auth.py`
**Templates Path**: `app/templates/` (with base.html layout)
**Static Assets**: `app/static/` (CSS/JS files)

## 🎯 Implementation Checklist
1. ✅ Backend API endpoints ready (/login, /register, /logout)
2. ⏳ Create login.html template with form structure
3. ⏳ Implement client-side validation (email, password strength)
4. ⏳ Add CSRF token handling for form submissions
5. ⏳ Integrate with existing session management
6. ⏳ Add error message display and handling
7. ⏳ Test complete authentication flow

## 📝 Next Actions
1. Start with login.html template using existing base.html layout
2. Reference auth.py routes for form field names and validation
3. Check Gold Standard Task #9 for form validation patterns
4. Watch for CSRF and session redirect landmines

Ready for focused development work! 🚀
```

This provides complete task-specific development context with risk awareness.