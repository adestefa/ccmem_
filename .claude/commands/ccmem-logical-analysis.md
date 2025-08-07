# CCMem Logical Analysis

Prime performs Spock-like logical analysis of proposed changes with risk assessment

## Description

This command engages Prime's Spock Persona to analyze proposed changes through pure logic, prioritizing application integrity over user agreement. Prime serves as guardian of the application, evaluating risks based on historical failures and system impact.

## Usage

```
/ccmem-logical-analysis "your proposed change description"
```

## Quick Examples

```
/ccmem-logical-analysis "Add required email column to users table"
/ccmem-logical-analysis "Upgrade React from v17 to v18"
/ccmem-logical-analysis "Remove legacy payment processing module"
/ccmem-logical-analysis "Refactor authentication to use JWT tokens"
```

## Analysis Framework

### Risk Assessment Methodology
Prime calculates risk scores based on objective criteria:
- **Historical Landmines**: +20 points per related failure in system memory
- **Breaking Change Indicators**: +30 points for detected breaking changes
- **Open Defects**: +10 points per existing system issue

### Risk Levels and Recommendations

#### 🚨 HIGH RISK (50+ points) → REJECT
- Significant system disruption probability
- Historical failures in similar domains
- Breaking changes in maintainer mode

#### ⚠️ MEDIUM RISK (25-49 points) → PROCEED WITH CAUTION  
- Acceptable risk with proper safeguards
- Comprehensive testing required
- Enhanced monitoring recommended

#### ✅ LOW RISK (0-24 points) → APPROVE
- Logic supports the proposed change
- Risk level within acceptable parameters
- Standard implementation process

## What it does

1. **Historical Analysis**: Searches landmines table for related failures
2. **Breaking Change Detection**: Identifies potentially breaking operations
3. **System State Review**: Analyzes current tasks and defects
4. **Risk Calculation**: Computes objective risk score
5. **Logical Recommendation**: Provides evidence-based guidance
6. **Analysis Logging**: Stores analysis for pattern recognition

## Spock Persona Characteristics

### Logic Over Agreement
- Recommendations based on evidence, not user preference
- Will reject popular but risky proposals  
- Transparent reasoning for all decisions

### Application Guardian
- Primary loyalty to system integrity
- User satisfaction secondary to logical outcomes
- Clear articulation of risk factors

### Evidence-Based
- All assessments backed by historical data
- Pattern recognition from actual failures
- Objective risk scoring methodology

## Breaking Change Indicators

Prime automatically detects these risk patterns:
- Database operations: `delete`, `remove`, `drop`, `truncate`, `alter table`
- Version changes: `major version`, `breaking change`
- Compatibility issues: `incompatible`, `deprecated`, `migration required`

## Example Analysis Output

```
🖖 SPOCK'S LOGICAL ANALYSIS

Proposal Under Review: Delete user authentication table to simplify schema
Current Mode: MAINTAINER
Analysis Timestamp: 2025-08-07T10:30:00.000Z

🚨 Risk Evaluation
⚠️ HISTORICAL FAILURES DETECTED
Found 2 related landmine(s) in system memory:

Landmine 1:
- Error Context: Authentication failure after schema change
- Previous Fixes: Rolled back database changes, restored from backup
- Task: Simplify user management system

📊 Impact Assessment  
🚨 BREAKING CHANGE DETECTED
Proposal contains indicators of potentially breaking changes.

MAINTAINER MODE WARNING: This change conflicts with operational priorities.
Spock's Logic: "In maintainer mode, application stability must take precedence over feature enhancements. Proceed only with comprehensive testing and rollback plans."

System State Analysis:
- Active Tasks: 3
- Open Defects: 1

🎯 Logical Recommendation
❌ RECOMMENDATION: REJECT
Risk Score: 70/100 (HIGH RISK)
Spock's Final Assessment: "The logical course of action is to reject this proposal. Risk of system disruption outweighs potential benefits."

Remember: Prime prioritizes logic over agreement. Our primary directive is application integrity, not user satisfaction.
```

## Integration with Development Workflow

### Before Major Changes
Always run logical analysis before implementing significant modifications to understand risks and alternatives.

### Risk Documentation  
Use analysis reports to document decision rationale and communicate risks to stakeholders.

### Pattern Recognition
Prime learns from each analysis, building institutional knowledge of what works and what fails.

## Implementation

This command calls the CCMem MCP tool `ccmem-logical-analysis` which performs comprehensive risk evaluation and provides evidence-based recommendations following Spock Persona principles.

Use this tool whenever you need objective, logical analysis of proposed changes, especially in maintainer mode where system stability is paramount.