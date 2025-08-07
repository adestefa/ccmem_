# Using ccmem-logical-analysis Command

## Purpose

The `/ccmem-logical-analysis` command engages Prime's Spock Persona to perform objective risk assessment of proposed changes. Prime analyzes proposals against historical failures, system state, and breaking change indicators to provide evidence-based recommendations.

## Basic Usage

```
/ccmem-logical-analysis "your proposed change description"
```

## Command Syntax

The command accepts a single parameter - a description of your proposed change in quotes.

### Examples

#### Example 1: Database Schema Change
```
/ccmem-logical-analysis "Add new required column 'email_verified' to users table"
```

#### Example 2: Code Refactoring
```
/ccmem-logical-analysis "Refactor authentication middleware to use JWT tokens instead of sessions"
```

#### Example 3: Dependency Update
```
/ccmem-logical-analysis "Upgrade React from version 17 to version 18"
```

#### Example 4: Feature Removal
```
/ccmem-logical-analysis "Remove the legacy reporting module to simplify codebase"
```

## What the Analysis Provides

### 1. Risk Score Calculation
- **Historical Landmines**: +20 points per related failure
- **Breaking Changes**: +30 points for detected breaking operations
- **Open Defects**: +10 points per existing system issue

### 2. Risk Level Assessment
- **0-24 points**: APPROVE (Low Risk)
- **25-49 points**: PROCEED WITH CAUTION (Medium Risk)
- **50+ points**: REJECT (High Risk)

### 3. Historical Context
- Related failures from system landmines table
- Previous attempted fixes and outcomes
- Pattern recognition from past errors

### 4. Breaking Change Detection
Prime automatically detects these risk indicators:
- Database operations: `delete`, `remove`, `drop`, `truncate`, `alter table`
- Version changes: `major version`, `breaking change`
- Compatibility: `incompatible`, `deprecated`, `migration required`

### 5. System State Analysis
- Current active tasks count
- Open defects that might be affected
- Overall system complexity assessment

## When to Use This Command

### Always Use Before:
- Database schema modifications
- Major dependency updates
- Architectural changes
- Feature removals or deprecations
- Production deployments

### Especially Important In:
- **Maintainer Mode**: When system stability is paramount
- **High-risk environments**: Production systems with many users
- **Legacy systems**: Applications with complex interdependencies
- **After incidents**: When system has recent failures

## Understanding the Output

### Sample Analysis Output
```
SPOCK'S LOGICAL ANALYSIS

Proposal Under Review: Add new required column 'email_verified' to users table
Current Mode: MAINTAINER
Analysis Timestamp: 2025-08-07T10:30:00.000Z

Risk Evaluation
HISTORICAL FAILURES DETECTED
Found 1 related landmine(s) in system memory:

Landmine 1:
- Error Context: Required column addition caused application crash
- Previous Fixes: Made column nullable, added default value
- Task: User verification system enhancement

Impact Assessment
BREAKING CHANGE DETECTED
Proposal contains indicators of potentially breaking changes.

MAINTAINER MODE WARNING: This change conflicts with operational priorities.
Spock's Logic: "In maintainer mode, application stability must take precedence 
over feature enhancements. Proceed only with comprehensive testing and rollback plans."

System State Analysis:
- Active Tasks: 2
- Open Defects: 0

Logical Recommendation
RECOMMENDATION: PROCEED WITH CAUTION
Risk Score: 30/100 (MEDIUM RISK)
Spock's Final Assessment: "Proposal is logically acceptable with proper safeguards. 
Implement comprehensive testing and monitoring."

Remember: Prime prioritizes logic over agreement. Our primary directive is 
application integrity, not user satisfaction.
```

## How to Act on Recommendations

### For APPROVE (Low Risk)
- Proceed with standard development practices
- Follow normal testing procedures
- Document changes as usual

### For PROCEED WITH CAUTION (Medium Risk)
- Create comprehensive test plan
- Implement staging environment testing
- Prepare rollback procedures
- Monitor system closely after deployment
- Consider phased rollout

### For REJECT (High Risk)
- Do not proceed with current approach
- Analyze why Prime rejected the proposal
- Look for alternative solutions
- Address underlying system issues first
- Consider breaking change into smaller steps

## Best Practices

### 1. Be Specific in Proposals
Instead of: "Update the database"
Use: "Add unique constraint to email column in users table"

### 2. Include Context
Instead of: "Remove old code"
Use: "Remove deprecated payment processing module that hasn't been used since v2.0"

### 3. Consider Timing
Run analysis before starting implementation, not after code is written.

### 4. Document Overrides
If you proceed against Prime's recommendation, document why and what safeguards you implemented.

## Integration with Development Workflow

### Pre-Implementation Analysis
1. Define proposed change clearly
2. Run `/ccmem-logical-analysis`
3. Review risk assessment and recommendations
4. Adjust approach based on Prime's analysis
5. Implement with appropriate safeguards

### Post-Analysis Actions
1. If approved: Proceed with normal workflow
2. If caution: Enhanced testing and monitoring
3. If rejected: Find alternative approach or address root issues

## Troubleshooting

### Command Not Found
Ensure CCMem MCP server is running and connected properly.

### No Historical Data
If system is new, Prime will focus on breaking change detection and system state analysis.

### Spock Analysis Disabled
If disabled, use `/ccmem-set-mode` to enable Spock analysis.

## Configuration

Prime's analysis behavior depends on operational mode set with `/ccmem-set-mode`:

- **Builder Mode**: More permissive, focuses on innovation
- **Maintainer Mode**: More restrictive, prioritizes stability

The logical analysis command works in conjunction with Prime's overall configuration to provide context-appropriate recommendations.