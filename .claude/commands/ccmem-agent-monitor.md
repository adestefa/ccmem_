# CCMem Agent Monitor

Prime monitors sub-agent activities and enforces safety protocols

## Description

This command provides real-time monitoring and safety enforcement for the Prime Swarm Orchestration System. Prime uses this tool to maintain logical oversight of all sub-agent activities, validate proposed actions, and respond to safety incidents with immediate intervention capabilities.

## Usage

```
/ccmem-agent-monitor [action]
```

## Available Actions

### Check Status
```
/ccmem-agent-monitor status
```
**Purpose**: View active swarm sessions and recent safety incidents
**Output**: 
- Currently running agent sessions
- Task descriptions and risk levels
- Recent sub-agent incidents and violations
- Overall system safety status

### Emergency Halt
```
/ccmem-agent-monitor halt [agent_id]
```
**Purpose**: Immediately stop all or specific sub-agent activities
**Parameters**:
- `agent_id` (optional): Specific agent to halt, or all if not specified
**Use Cases**:
- Dangerous operations detected
- System instability from agent actions
- User-requested emergency stop
- Safety protocol violations

### Validate Sub-Agent Action
```
/ccmem-agent-monitor validate_action "proposed action" [agent_id]
```
**Purpose**: Pre-approve sub-agent proposed actions using Spock logic
**Parameters**:
- `proposed_action`: Description of what the sub-agent wants to do
- `agent_id` (optional): Identifier of the requesting agent
**Returns**: APPROVED, REQUIRES_OVERSIGHT, or REJECTED with risk analysis

### Report Safety Incident
```
/ccmem-agent-monitor incident_report "incident details" [agent_id]
```
**Purpose**: Log sub-agent safety violations as landmines for pattern recognition
**Parameters**:
- `incident_details`: Description of what went wrong
- `agent_id` (optional): Agent that caused the incident
**Actions**: Creates landmine entry, increases oversight level

## Status Monitoring

### Active Sessions Display
```
Session 1: Implement user authentication with OAuth2
- Mode: maintainer
- Risk Level: 3/5
- Agents: 4
- Status: Active with oversight

Session 2: Add email validation to registration
- Mode: builder
- Risk Level: 1/5
- Agents: 2
- Status: Completed successfully
```

### Recent Incidents Tracking
```
Incident 1: Sub-agent attempted unauthorized database modification
- Fixes Attempted: Prime intervention required. Sub-agent actions halted for safety review.
- Timestamp: 2025-08-07T15:30:00Z

Incident 2: Agent tried to delete production configuration file
- Fixes Attempted: Emergency halt activated. File deletion blocked.
- Timestamp: 2025-08-07T14:45:00Z
```

## Action Validation System

### Risk Assessment Process
1. **Keyword Analysis**: Scans for dangerous operations
2. **Historical Matching**: Checks against known failure patterns
3. **Risk Scoring**: Calculates objective risk level (0-100)
4. **Logical Assessment**: Applies Spock-level logical analysis
5. **Decision**: APPROVED, REQUIRES_OVERSIGHT, or REJECTED

### Dangerous Operation Detection
**High-Risk Commands**:
- File System: `rm -rf`, `delete`, `remove`, `destroy`, `wipe`, `format`, `clear`, `reset`, `purge`
- Database: `drop table`, `delete from`, `truncate table`, `alter table`
- System: Operations affecting production, configuration, or security

### Risk Scoring Formula
- **Dangerous Keywords**: +30 points each
- **SQL Risks**: +40 points each
- **Historical Landmines**: +25 points per related failure

**Decision Thresholds**:
- **0-24 points**: APPROVED - "Action is logically sound and presents acceptable risk level."
- **25-49 points**: REQUIRES_OVERSIGHT - "Action may proceed under direct Prime supervision with additional safeguards."
- **50+ points**: REJECTED - "This action presents unacceptable risk to system integrity. Sub-agent must find alternative approach."

## Safety Enforcement

### Emergency Halt Procedure
When `halt` is initiated:
1. **Immediate Suspension**: All sub-agent activities cease instantly
2. **State Rollback**: Operations rolled back to last safe checkpoint
3. **Incident Logging**: Emergency halt recorded for analysis
4. **Oversight Increase**: Prime supervision level raised to maximum
5. **Safety Review**: Full assessment before any resumption

### Incident Response Protocol
When safety violation occurs:
1. **Immediate Documentation**: Incident details captured
2. **Landmine Creation**: Violation logged for pattern recognition
3. **Supervision Increase**: Enhanced monitoring for related activities
4. **Protocol Review**: Safety measures analyzed and reinforced
5. **Future Prevention**: Similar actions flagged for scrutiny

## Integration with Spock Persona

### Logical Decision Making
- All validation decisions based on evidence and historical data
- Risk assessments use objective scoring, not subjective judgment
- Recommendations prioritize application integrity over user convenience

### Mode-Specific Behavior
**Builder Mode**:
- More permissive validation with safety guardrails
- Focus on innovation while maintaining logical oversight
- Higher risk tolerance balanced with learning safeguards

**Maintainer Mode**:
- Strict validation with minimal risk tolerance
- Priority on system stability and integrity
- Automatic rejection of operations with significant risk

## Common Use Cases

### Proactive Monitoring
```bash
# Check current swarm status
/ccmem-agent-monitor status

# Regular safety checkpoint
/ccmem-agent-monitor validate_action "Update user email validation regex" agent_2
```

### Safety Incident Response
```bash
# Emergency stop for dangerous behavior
/ccmem-agent-monitor halt

# Report and log safety violation
/ccmem-agent-monitor incident_report "Agent attempted to modify production database without authorization" agent_3
```

### Validation Workflow
```bash
# Pre-approve significant changes
/ccmem-agent-monitor validate_action "Refactor authentication middleware to support JWT tokens" architecture_agent

# Validate database operations
/ccmem-agent-monitor validate_action "Create new index on users.email column" implementation_agent
```

## Best Practices

### For Continuous Monitoring
1. **Regular Status Checks**: Monitor active sessions periodically
2. **Proactive Validation**: Approve significant actions before execution
3. **Incident Awareness**: Stay informed about safety violations
4. **Pattern Recognition**: Learn from repeated validation patterns

### For Safety Management
1. **Quick Response**: Use halt immediately when risks detected
2. **Detailed Reporting**: Provide comprehensive incident details
3. **Follow-up Analysis**: Review patterns in rejected/halted actions
4. **Preventive Measures**: Address root causes of safety incidents

### For Development Teams
1. **Trust Prime's Logic**: Respect validation decisions
2. **Learn from Rejections**: Understand why actions were blocked
3. **Collaborate with Safety**: Work with oversight rather than against it
4. **Report Issues**: Use incident reporting for learning

## Implementation

This command calls the CCMem MCP tool `ccmem-agent-monitor` which:
- Tracks all sub-agent activities and sessions
- Validates proposed actions against safety criteria
- Enforces emergency halt procedures when needed
- Logs all safety incidents as landmines for learning
- Provides comprehensive visibility into swarm operations

The agent monitor serves as Prime's eyes and enforcement mechanism, ensuring that the promise of safe, logical AI orchestration is maintained at all times.