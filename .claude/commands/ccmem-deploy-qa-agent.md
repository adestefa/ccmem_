# CCMem Deploy QA Agent

Deploy specialized QA agent for completed tasks

## Description

This command deploys Prime's QA agents with zero tolerance for shortcuts. QA agents use Serena for code analysis and Playwright for functional testing, automatically creating defects for any mocks, shortcuts, or unmet success criteria discovered.

## Usage

```
/ccmem-deploy-qa-agent task_id [qa_type] [priority]
```

## Parameters

- `task_id` (required): ID of completed task to validate
- `qa_type` (optional): Type of QA validation to perform
  - `comprehensive` - Full validation suite (default)
  - `code_review` - Serena-based code quality analysis
  - `functional_test` - Playwright automated testing
  - `mock_detection` - Scan for shortcuts and placeholders
  - `success_criteria` - Validate against original requirements
- `priority` (optional): QA agent priority level
  - `normal` - Standard QA timeline (default)
  - `high` - Expedited QA for critical tasks
  - `critical` - Immediate QA for production issues
  - `low` - Background QA for non-urgent tasks

## QA Validation Types

### Comprehensive QA (Default)
```bash
/ccmem-deploy-qa-agent 42
/ccmem-deploy-qa-agent 42 comprehensive
```
**Includes**:
- Complete code review with Serena analysis
- Mock and shortcut detection
- Functional testing with Playwright
- Success criteria validation
- Security and performance checks

### Code Review Only
```bash
/ccmem-deploy-qa-agent 42 code_review
```
**Serena Analysis**:
- Code quality and style compliance
- Security vulnerability scanning
- Performance anti-pattern detection
- Architecture consistency validation
- Documentation completeness check

### Functional Testing Only
```bash
/ccmem-deploy-qa-agent 42 functional_test
```
**Playwright Testing**:
- User workflow automation
- Cross-browser compatibility
- Error handling validation
- Performance benchmarking
- Accessibility compliance

### Mock Detection Only
```bash
/ccmem-deploy-qa-agent 42 mock_detection
```
**Zero Tolerance Scanning**:
- Console.log statements in production code
- Hardcoded return values with mock comments
- setTimeout(0) fake async implementations
- Skipped or disabled tests (xit, skip)
- Placeholder functions and classes
- Mock service responses not replaced

### Success Criteria Validation
```bash
/ccmem-deploy-qa-agent 42 success_criteria
```
**Requirements Verification**:
- Original backlog success criteria testing
- User acceptance criteria validation
- Performance requirement verification
- Business logic correctness
- Data integrity validation

## QA Agent Behavior

### Mock Detection Philosophy
**Prime's Directive**: "We recommend against any action that would be illogical and break the application. Mocks and shortcuts undermine system integrity and must be cataloged as defects."

**Automatic Defect Creation**:
- **Every detected mock becomes a defect**
- **No exceptions** - even "temporary" shortcuts
- **Detailed remediation plans** provided
- **Blocked story completion** until resolved

### Success Criteria Enforcement
**Validation Process**:
1. **Parse original criteria** from backlog story
2. **Generate test scenarios** based on requirements
3. **Execute validation tests** with evidence collection
4. **Compare actual vs. expected** outcomes
5. **Create defects** for any unmet criteria

### QA Agent Session Management
**Session Lifecycle**:
```
Task Complete → QA Agent Deploy → Validation → Results → Defect Creation → Task Status Update
```

**Status Tracking**:
- `in_qa` - QA agent actively validating
- `qa_passed` - All validations successful
- `qa_failed` - Defects found, remediation needed

## Response Format

```json
{
  "session_id": "qa_1691438400_x7k9m2n",
  "task_id": 42,
  "qa_type": "comprehensive",
  "results": {
    "overall_status": "warning",
    "findings": [
      {
        "type": "mock_detection",
        "total_mocks_found": 2,
        "details": [
          {
            "pattern": "console.log",
            "file": "src/utils/debugHelper.ts",
            "line": 15
          }
        ]
      }
    ],
    "defects_created": [
      {
        "type": "mock",
        "severity": "medium",
        "description": "Console.log statements found in production code",
        "remediation": "Replace with proper logging framework"
      }
    ]
  }
}
```

## QA Status Outcomes

### ✅ QA Passed
- **All validations successful**
- **No mocks or shortcuts found**
- **Success criteria completely met**
- **Task marked as completed**
- **Ready for Prime commit consideration**

### ⚠️ QA Warning  
- **Minor issues detected**
- **Mocks found but documented**
- **Success criteria mostly met**
- **Defects created for tracking**
- **Task completion allowed with caveats**

### ❌ QA Failed
- **Critical issues discovered**
- **Unacknowledged mocks present**
- **Success criteria not met**
- **Task returned to in_progress**
- **Defect resolution required**

## Defect Categorization

### Mock Defects
**Severity Levels**:
- **Critical**: Production functionality mocked
- **High**: Core business logic shortcuts
- **Medium**: Development conveniences left in code
- **Low**: Debug statements and test artifacts

### Success Criteria Defects
**Types**:
- **Functional**: Feature doesn't work as specified
- **Performance**: Response times exceed requirements
- **Usability**: User experience doesn't match criteria
- **Integration**: System interactions incomplete

## Integration with Prime Swarm

### Agent Coordination
- **Dev agents complete tasks** → **QA agents automatically deployed**
- **File isolation maintained** → **QA agents test in separate git trees**
- **Prime oversight continues** → **QA results reviewed before commit**
- **Defect resolution prioritized** → **Story blocked until QA passes**

### Quality Gate Enforcement
Prime ensures:
1. **No story completion** without QA validation
2. **All defects resolved** before commit consideration
3. **Success criteria verified** against original requirements
4. **Zero tolerance** for unacknowledged shortcuts

## Best Practices

### For Development Teams
1. **Expect rigorous QA** - Build quality in, don't rely on QA to catch everything
2. **Document any shortcuts** - Temporary solutions should be explicitly tracked
3. **Write comprehensive tests** - Reduce QA agent workload through self-validation
4. **Review success criteria** - Ensure implementation matches original requirements

### For QA Process
1. **Trust agent findings** - QA agents are thorough and consistent
2. **Address all defects** - No exceptions for "minor" issues
3. **Validate remediation** - Re-run QA after defect fixes
4. **Learn from patterns** - Use QA results to improve development practices

## Serena Integration

### Code Analysis Capabilities
- **Symbol-level analysis** of recently modified code
- **Pattern detection** for anti-patterns and code smells
- **Security scanning** for hardcoded credentials and vulnerabilities
- **Architecture compliance** checking against project standards
- **Documentation analysis** for completeness and accuracy

### Smart File Detection
QA agents automatically identify:
- Files modified in task's git tree
- Related test files and specs
- Configuration changes
- Documentation updates

## Playwright Integration

### Automated Testing Scenarios
- **Generated from task description** and success criteria
- **Cross-browser validation** ensuring compatibility
- **User workflow automation** testing complete user journeys
- **Error condition testing** validating proper error handling
- **Performance measurement** against specified requirements

### Test Evidence Collection
- **Screenshots** of successful operations
- **Performance metrics** for response times
- **Error logs** for failed scenarios
- **Accessibility reports** for compliance validation

Prime's QA system embodies uncompromising quality: "Logic dictates that thorough validation prevents defects from reaching users. No shortcuts, no exceptions, no compromises on application integrity."