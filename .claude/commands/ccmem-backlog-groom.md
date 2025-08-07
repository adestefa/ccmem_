# CCMem Backlog Groom

Prime analyzes backlog and recommends next story

## Description

This command activates Prime's backlog grooming system, where Prime analyzes the backlog using logical reasoning to recommend the optimal next story based on business value, risk assessment, and current workload capacity.

## Usage

```
/ccmem-backlog-groom [action] [story_id]
```

## Parameters

- `action` (optional): Grooming action to perform
  - `recommend_next` - Get Prime's next story recommendation (default)
  - `analyze_all` - Analyze all backlog items for risk
  - `risk_assess` - Assess specific story risk
  - `prioritize` - Re-prioritize backlog based on analysis
- `story_id` (optional): Specific backlog story ID for targeted actions

## Actions

### Recommend Next Story
```bash
/ccmem-backlog-groom
/ccmem-backlog-groom recommend_next
```
**Prime's Logic**:
1. Checks current workload capacity (< 2 active tasks)
2. Calculates weighted scores: `(business_value * 2 - risk_score - priority)`
3. Recommends highest scoring story with risk analysis
4. Provides logical reasoning for recommendation

**Response Example**:
```json
{
  "action": "recommend_story",
  "recommendation": {
    "id": 3,
    "title": "Data Export Feature",
    "business_value": 7,
    "risk_score": 10,
    "weighted_score": 12
  },
  "risk_analysis": {
    "recommendation": "APPROVE",
    "detected_risks": [],
    "related_landmines": 0
  },
  "reasoning": "Based on business value (7/10) and estimated complexity (simple), this story provides optimal value-to-risk ratio."
}
```

### Analyze All Backlog Items
```bash
/ccmem-backlog-groom analyze_all
```
**Prime's Process**:
- Scans each backlog item for risk keywords
- Checks historical landmine patterns
- Updates risk scores in database
- Provides comprehensive analysis summary

### Risk Assessment of Specific Story
```bash
/ccmem-backlog-groom risk_assess 42
```
**Prime's Analysis**:
- Deep dive into specific story risks
- Historical failure pattern matching
- Complexity and impact assessment
- Detailed recommendation with reasoning

### Prioritize Entire Backlog
```bash
/ccmem-backlog-groom prioritize
```
**Prime's Reordering**:
- Recalculates all weighted scores
- Considers interdependencies
- Updates priority rankings
- Provides justification for changes

## Prime's Risk Assessment Framework

### Risk Scoring Algorithm
```
Base Risk Score = Complexity Multiplier
+ Keyword Detection = +10 per dangerous keyword
+ Historical Landmines = +15 per related past failure
+ External Dependencies = +5 per external system
```

### Dangerous Keywords Detected
- **Database Operations**: delete, drop, truncate, alter table
- **System Changes**: remove, destroy, wipe, format
- **Architecture**: migrate, refactor, breaking change
- **Production Impact**: deployment, configuration, security

### Risk Recommendation Thresholds
- **0-24 points**: `APPROVE` - Low risk, proceed normally
- **25-49 points**: `CAUTION` - Medium risk, enhanced testing required
- **50+ points**: `REJECT` - High risk, find alternative approach

## Workload Management

### Prime's Workload Assessment
Prime recommends new stories only when:
1. **Active task count < 2** - Prevents overloading development
2. **No high-priority defects** - Quality issues take precedence
3. **No blocked tasks** - Resolve impediments first
4. **Agent availability** - Sub-agents available for assignment

### Capacity-Based Recommendations
- **Light workload**: Recommends complex, high-value stories
- **Medium workload**: Focuses on moderate complexity items
- **Heavy workload**: Suggests simple, quick wins only
- **Overloaded**: No recommendations until capacity frees up

## Logical Decision Making

### Prime's Reasoning Process
1. **Objective Analysis**: Evidence-based risk assessment
2. **Historical Learning**: Pattern recognition from past failures
3. **Value Optimization**: Business impact vs. implementation cost
4. **Logical Consistency**: Decisions align with Spock Persona principles
5. **Application Integrity**: Safety prioritized over user preference

### Example Prime Logic
```
"Story A scores 15 points (business_value: 8, risk: 5, priority: 2).
Story B scores 12 points (business_value: 6, risk: 10, priority: 3).
Historical analysis shows no landmines related to Story A.
Story B has 1 related failure pattern from database migration.
Logical recommendation: Story A - Higher value, lower risk, proven implementation path."
```

## Integration with Dashboard

### Real-Time Updates
- Recommendations appear in dashboard modal
- Risk scores update backlog visualization
- User approval triggers story creation
- Analysis results cached for quick access

### User Interaction Flow
1. **Prime analyzes** when workload drops
2. **Recommendation modal** shows Prime's choice
3. **User reviews** risk analysis and reasoning
4. **Approval/rejection** recorded for future learning
5. **Story creation** if approved, or back to backlog

## Best Practices

### For Development Teams
1. **Trust Prime's analysis** - Logical recommendations based on evidence
2. **Review risk assessments** - Understand why stories are flagged
3. **Provide feedback** - Help Prime learn from approval/rejection patterns
4. **Monitor workload** - Prime optimizes based on team capacity

### For Project Managers
1. **Regular grooming** - Run analysis periodically to update risk scores
2. **Capacity planning** - Use Prime's recommendations for sprint planning
3. **Risk management** - Address high-risk stories with proper precautions
4. **Value tracking** - Monitor business value delivery through Prime's selections

## Learning and Adaptation

### Prime's Continuous Improvement
- **Pattern Recognition**: Learns from successful story outcomes
- **Risk Calibration**: Adjusts scoring based on actual vs. predicted complexity
- **User Preference Learning**: Adapts to team's risk tolerance over time
- **Landmine Prevention**: Historical failures prevent similar future mistakes

Prime's backlog grooming embodies the Spock Persona: "Logical analysis of available options yields optimal resource allocation for maximum value delivery while minimizing application integrity risks."