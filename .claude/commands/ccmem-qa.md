# CCMem QA

Initialize context for task quality assurance work

## Description

This command loads comprehensive QA context for a specific task, including implementation details, testing strategies, quality checkpoints, and defect patterns. Optimized for thorough quality assurance work.

## Usage

```
/ccmem-qa <taskId>
```

## Parameters

- `taskId` (required): The ID of the task to initialize QA context for

## What it does

1. **QA Context Loading**:
   - Loads task implementation details and completion status
   - Shows code changes, files modified, and implementation approach
   - Provides testing requirements and acceptance criteria
   - Includes implementation timeline and development history

2. **Quality Assessment Framework**:
   - Shows relevant testing strategies from testing table
   - Provides quality checkpoints and validation criteria
   - Includes code review guidelines and standards
   - Suggests testing approaches and coverage requirements

3. **Defect Pattern Analysis**:
   - Identifies common defect patterns for similar task types
   - Shows historical defect data and resolution patterns
   - Provides context on recurring quality issues
   - Includes prevention strategies and early warning signs

4. **Risk-Based Testing Guidance**:
   - Highlights high-risk areas based on landmine patterns  
   - Shows integration points and dependency risks
   - Provides regression testing guidance
   - Includes performance and security considerations

5. **Quality Metrics and Standards**:
   - Shows relevant gold standard implementations for comparison
   - Provides quality benchmarks and success criteria
   - Includes automated testing and validation tools
   - Suggests manual testing procedures and edge cases

## When to Use

- **QA Planning**: Before starting quality assurance on completed tasks
- **Code Review**: Understanding task context for thorough review
- **Testing Strategy**: Planning comprehensive test coverage
- **Defect Investigation**: When investigating quality issues
- **Release Preparation**: Ensuring task quality before deployment

## Implementation

This command calls the CCMem MCP tool `ccmem-qa` with the specified task ID.

## Example Usage

```
/ccmem-qa 15
```

## Example Output

```
🔍 CCMem QA - Task #15 Quality Assurance Context

## Task Implementation Review
🎯 Task #15: "Add frontend authentication forms"
📖 Story: #5 - Implement user authentication system with JWT tokens
✅ Status: Completed | Developer: auth-frontend-session-3
📁 Files Modified: login.html, register.html, auth.js, auth.css, test_auth.py

## Implementation Summary
🔧 **Changes Made**:
   - Created login/register forms with validation
   - Added CSRF token handling
   - Implemented JavaScript form validation
   - Added error message display system
   - Created responsive form styling

## 🧪 Testing Strategy
**Automated Tests Required**:
   - Unit tests: Form validation functions
   - Integration tests: Login/register flow end-to-end
   - Security tests: CSRF protection, XSS prevention
   - Browser tests: Cross-browser form compatibility

**Manual Testing Checklist**:
   - ✅ Valid login credentials accepted
   - ✅ Invalid credentials properly rejected
   - ✅ Password strength validation working
   - ✅ Email format validation active
   - ⏳ CSRF token properly handled
   - ⏳ Error messages display correctly
   - ⏳ Form submission without JavaScript works
   - ⏳ Mobile responsive behavior

## ⚠️ Quality Risk Areas
**High-Risk Components** (based on landmine patterns):
   - **CSRF Token Handling**: Historical issues with missing tokens (Landmine #8)
   - **Session Redirects**: Login redirect loops (Landmine #15)
   - **Form Validation**: Client-side bypass vulnerabilities (Landmine #12)

**Security Testing Priority**:
   - XSS prevention in form inputs
   - SQL injection protection (parameterized queries)
   - Session fixation attacks
   - Password policy enforcement

## 🏆 Quality Standards (Gold Standard Comparison)
**Reference Implementation**: Task #9 - User profile forms
   - Progressive enhancement pattern ✅
   - Unified error handling ✅  
   - CSRF integration approach ✅
   - Responsive design consistency ⏳

## 🔧 Testing Environment Setup
**Test Commands**:
   - `pytest app/tests/test_auth.py` - Backend API tests
   - `pytest app/tests/test_auth_forms.py` - Form validation tests
   - Manual testing: `./start.sh development` → http://localhost:8001

**Browser Testing**:
   - Chrome/Firefox/Safari compatibility
   - Mobile viewport testing (iPhone/Android)
   - Accessibility testing (screen readers, keyboard navigation)

## 📋 QA Checklist
### Functional Testing
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials fails appropriately  
- [ ] Registration creates new user account
- [ ] Password strength requirements enforced
- [ ] Email validation prevents invalid formats
- [ ] CSRF tokens prevent unauthorized submissions

### Security Testing  
- [ ] XSS attacks blocked in form inputs
- [ ] SQL injection attempts fail safely
- [ ] Session management secure (no fixation)
- [ ] Password hashing properly implemented

### Usability Testing
- [ ] Error messages clear and helpful
- [ ] Form validation responsive and immediate
- [ ] Mobile experience intuitive and functional
- [ ] Accessibility compliance (WCAG guidelines)

### Integration Testing
- [ ] Forms integrate properly with authentication system
- [ ] Session management works across page transitions
- [ ] Error handling consistent with rest of application

## 🎯 Quality Gate Criteria
**Must Pass Before Deployment**:
1. All automated tests passing (pytest)
2. Manual testing checklist 100% complete
3. Security review completed and approved
4. Cross-browser compatibility verified
5. Performance acceptable (<2s form submission)

Current QA Status: ⚠️ In Progress - Security testing pending

Ready for comprehensive quality assurance! 🔍
```

This provides complete QA context with risk-aware testing guidance.