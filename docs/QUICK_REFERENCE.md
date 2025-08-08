# CCMem Quick Reference Guide

## Essential Commands

### Set Prime's Operational Mode
```bash
# For new projects (more permissive)
/ccmem-set-mode builder

# For production systems (more restrictive, default)
/ccmem-set-mode maintainer
```

### Prime Swarm Orchestration
```bash
# Deploy sub-agents with Prime oversight
/ccmem-prime-swarm "implement user authentication system"
/ccmem-prime-swarm "refactor payment processing with error handling"
/ccmem-prime-swarm "add comprehensive logging to API endpoints"

# Monitor sub-agent activities
/ccmem-agent-monitor status
/ccmem-agent-monitor halt
/ccmem-agent-monitor validate_action "proposed action" agent_id
/ccmem-agent-monitor incident_report "safety violation details" agent_id
```

### Analyze Proposed Changes
```bash
# Basic usage
/ccmem-logical-analysis "your proposed change description"

# Examples
/ccmem-logical-analysis "Add email_verified column to users table"
/ccmem-logical-analysis "Update Node.js from v16 to v18"
/ccmem-logical-analysis "Remove deprecated reporting features"
```

### Project Management
```bash
# Initialize project memory
/ccmem-init

# Create new story
/ccmem-prime "Create user authentication system"

# List current work
/ccmem-list

# View project overview
/get-full-project-summary
```

### Learning and Knowledge
```bash
# Teach Prime about your system
/ccmem-prime-learn filename.md

# Search Prime's knowledge  
/ccmem-recall-facts authentication

# Update dashboard
/refresh-dashboard
```

## Risk Assessment Quick Guide

### Risk Scores
- **0-24**: APPROVE (Low Risk) - Proceed normally
- **25-49**: CAUTION (Medium Risk) - Enhanced testing required
- **50+**: REJECT (High Risk) - Find alternative approach

### Breaking Change Indicators
Prime automatically detects these high-risk operations:
- Database: `delete`, `drop`, `alter table`, `truncate`
- Versions: `major version`, `breaking change`
- Compatibility: `incompatible`, `deprecated`, `migration required`

## Operational Modes

### Builder Mode (Green Field)
- **Use for**: New projects, prototypes, rapid development
- **Focus**: Innovation, feature velocity, technical exploration
- **Risk tolerance**: Higher, with quality safeguards

### Maintainer Mode (Brown Field)
- **Use for**: Production systems, legacy apps, stable releases
- **Focus**: Stability, integrity, risk mitigation
- **Risk tolerance**: Lower, comprehensive testing required

## Core Principles

### Prime's Directive
"We recommend against any action that would be illogical and break the application. 
We always prioritize field summary over code changes."

### Logic Over Agreement
- Prime will reject popular but risky proposals
- Recommendations based on evidence, not user preference
- Application integrity takes precedence over user satisfaction

## Common Workflows

### Before Making Changes
1. Set appropriate mode: `/ccmem-set-mode [builder|maintainer]`
2. Analyze proposal: `/ccmem-logical-analysis "description"`
3. Review recommendations and risk score
4. Adjust approach based on Prime's analysis
5. Implement with appropriate safeguards

### Starting New Project
1. Initialize: `/ccmem-init`
2. Set mode: `/ccmem-set-mode builder`
3. Create initial story: `/ccmem-prime "project description"`
4. Teach Prime: `/ccmem-prime-learn project-docs.md`

### Managing Existing System
1. Set maintainer mode: `/ccmem-set-mode maintainer`
2. Review current state: `/ccmem-list`
3. Analyze before changes: `/ccmem-logical-analysis "change description"`
4. Follow Prime's recommendations carefully

## Troubleshooting

### Commands Not Working
- Ensure CCMem MCP server is running
- Check that you're in the correct project directory
- Verify `.mcp.json` configuration

### No Analysis Data
- New systems have limited historical data
- Prime focuses on breaking change detection
- Build history through normal development process

### Override Prime's Recommendations
- Document rationale for proceeding against advice
- Implement extra safeguards and monitoring
- Consider if alternative approach exists