# CCMem Prime Swarm

Prime orchestrates specialized sub-agents with logical oversight and safety monitoring

## Description

This command activates Prime's Swarm Orchestration System, where Prime serves as the logical guardian overseeing specialized sub-agents. Prime maintains Spock-level oversight, ensuring all sub-agent actions follow logical principles and protect application integrity.

## Usage

```
/ccmem-prime-swarm "task description"
```

## Parameters

The system automatically configures based on task analysis, but you can specify:
- **Complexity**: Detected from task description (simple/moderate/complex/high_risk)
- **Agent Count**: 1-5 agents allocated based on complexity
- **Feature Branch**: Automatically required for risky operations in Maintainer mode

## Examples

### Simple Task
```
/ccmem-prime-swarm "Add email validation to user registration form"
```
**Result**: 2 agents (Implementation + Validation), standard oversight

### Moderate Task
```
/ccmem-prime-swarm "Implement password reset functionality with email verification"
```
**Result**: 3 agents (Analysis + Implementation + Validation), enhanced monitoring

### Complex Task
```
/ccmem-prime-swarm "Refactor authentication system to support multiple OAuth providers"
```
**Result**: 4-5 agents with specialized roles, feature branch isolation

### High-Risk Task
```
/ccmem-prime-swarm "Migrate user database to new schema with zero downtime"
```
**Result**: Possible rejection in Maintainer mode, mandatory safety protocols if approved

## Risk Assessment

Prime automatically analyzes tasks for dangerous operations:

### High-Risk Keywords Detected
- **Database**: `delete`, `drop`, `truncate`, `alter table`, `migration`
- **System**: `remove`, `destroy`, `wipe`, `format`, `reset`
- **Architecture**: `refactor`, `rewrite`, `breaking change`

### Risk Levels
- **Low Risk (0-2)**: Standard agent deployment and oversight
- **Medium Risk (3-4)**: Enhanced monitoring and safety protocols
- **High Risk (5+)**: Automatic halt in Maintainer mode, feature branch required

## Agent Roles by Complexity

### Simple Tasks
- **Implementation Agent**: Executes the work directly
- **Validation Agent**: Tests and verifies results

### Moderate Tasks
- **Analysis Agent**: Breaks down requirements and plans approach
- **Implementation Agent**: Executes core functionality
- **Validation Agent**: Tests implementation and verifies safety

### Complex/High-Risk Tasks
- **Architecture Agent**: Designs system changes and assesses impact
- **Implementation Agent**: Executes development work
- **Testing Agent**: Comprehensive validation and edge case testing
- **Security Agent**: Assesses security implications
- **Integration Agent**: Ensures compatibility with existing systems

## Prime's Guardian Responsibilities

### Logical Oversight
- Verify all sub-agent decisions follow logical principles
- Challenge illogical or risky proposals with evidence-based analysis
- Ensure compliance with Builder/Maintainer mode constraints

### Safety Monitoring
- Halt any actions that could break the application
- Block patterns that have caused historical failures
- Implement safeguards for high-risk operations

### Quality Assurance
- Ensure all changes meet architectural standards
- Validate integration with existing systems
- Verify comprehensive testing coverage

## Operational Mode Impact

### Builder Mode (Green Field Projects)
- **Approach**: Innovation-focused with logical safeguards
- **Risk Tolerance**: Higher, balanced with safety protocols
- **Agent Count**: Up to 5 for complex tasks
- **Speed**: Optimized for rapid development with oversight

### Maintainer Mode (Brown Field Projects)
- **Approach**: Stability-first with minimal risk tolerance
- **Safety Protocols**: Automatic rejection of high-risk tasks
- **Feature Branches**: Required for any detected risks
- **Validation**: Enhanced testing and rollback preparation

## Safety Mechanisms

### Automatic Protections
- **Risk Detection**: Scans task descriptions for dangerous keywords
- **Historical Analysis**: Checks against known failure patterns (landmines)
- **Mode Compliance**: Enforces Builder/Maintainer mode restrictions
- **Emergency Halt**: Immediate stop capability for dangerous actions

### Feature Branch Isolation
Automatically required when:
- Risk keywords detected in Maintainer mode
- Task complexity is high_risk
- Historical landmines match task patterns
- User explicitly requests isolation

### Emergency Procedures
- **Halt Command**: "PRIME STOP" - Immediate cessation of all activities
- **Rollback Protocol**: Automatic reversion to safe state
- **Incident Reporting**: All safety violations logged as landmines
- **Prime Override**: Direct intervention for safety-critical situations

## Agent Communication

### Agent Log Monitoring
- **File**: `agent_log.md` created for session tracking
- **Content**: All sub-agent activities and decisions
- **Oversight**: Prime reviews all entries for safety compliance
- **Retention**: Permanent record for pattern analysis

### Safety Checkpoints
- **Pre-Action**: Major actions require Prime validation
- **Progress Updates**: Regular status reports to Prime
- **Result Verification**: Completed work safety confirmation
- **Incident Response**: Immediate reporting of any issues

## Integration with CCMem

### Landmine System
- All sub-agent safety violations become landmines
- Historical patterns prevent similar future failures
- Pattern recognition improves over time

### Dashboard Integration
- Swarm activities visible in kanban board
- Progress tracking shows agent work status
- Risk indicators highlight safety concerns

### Facts Database
- Session details logged for pattern recognition
- Risk assessments stored for future reference
- Mode configurations affect swarm behavior

## Success Patterns

### Effective Task Descriptions
- **Clear Scope**: Specific, actionable requirements
- **Context Provided**: Background information and constraints
- **Success Criteria**: Measurable outcomes defined
- **Risk Awareness**: Acknowledge potential complications

### Example Good Descriptions
- "Add user profile image upload with AWS S3 integration and thumbnail generation"
- "Implement rate limiting for API endpoints to prevent abuse (100 requests/minute per IP)"
- "Create automated backup system for user data with daily schedule and retention policy"

### Example Poor Descriptions
- "Fix the user system" (too vague)
- "Make everything faster" (unmeasurable)
- "Delete old code" (potentially dangerous)

## Implementation

This command calls the CCMem MCP tool `ccmem-prime-swarm` which:
- Analyzes task for risk factors and complexity
- Deploys appropriate number of specialized agents
- Establishes Prime oversight and monitoring
- Implements safety protocols and emergency procedures
- Creates agent logging and communication channels

Use this command when you need intelligent, coordinated work on complex tasks while maintaining the highest levels of safety and logical oversight.