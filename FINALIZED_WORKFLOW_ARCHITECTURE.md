# Finalized CCMem Workflow Architecture

## Core Data Flow

```
User → Dashboard → Backlog → Prime Risk Assessment → User Confirmation → Story → Tasks → Dev Agents → QA Agents → Defects → Prime Commit
```

## Table Hierarchy

### Primary Tables (in order)
1. **`backlog`** - User story input, waits for Prime analysis
2. **`story`** - Approved work from backlog, Prime actively manages  
3. **`task`** - Broken down work units from stories
4. **`defect`** - Issues found by QA agents

### Relationships
- **Tasks belong to Stories** (`task.story_id → story.id`)
- **Defects belong to Stories** (`defect.story_id → story.id`) 
- **Defects can reference Tasks** (`defect.task_id → task.id`)
- **Stories originate from Backlog** (`story.created_from_backlog_id → backlog.id`)

## Prime's Focus Areas

### When Story Queue Empty
- **Scans backlog** for high-value items
- **Performs risk assessment** on promising stories
- **Presents recommendation to user** with risk/value analysis
- **Awaits user confirmation** before creating story

### When Stories Active in Queue
- **Prioritizes active stories** over backlog analysis
- **Breaks stories into tasks** sequentially 
- **Assigns dev agents to tasks** with file isolation
- **Monitors task completion** and triggers QA
- **Reviews QA results** and manages defect resolution
- **Plans commits** after story completion with testing

## Development Isolation Strategy

### Git Tree Approach
```
main branch
├── feature/story-{id}-dev     (dev agent work tree)  
├── feature/story-{id}-qa      (qa agent testing tree)
└── feature/story-{id}-ready   (Prime merge preparation)
```

### Sequential Development Process
1. **Story Analysis**: Prime creates tasks in dependency order
2. **Task Assignment**: Dev agents work on one task per story at a time
3. **File Isolation**: Each agent locks files during active work
4. **QA Validation**: QA agents test in separate git tree
5. **Prime Review**: Analyzes git tree for safe merge into main
6. **Commit Orchestration**: Prime creates clean commits after full story completion

## Prime's Operational States

### Backlog Management Mode
**Trigger**: No active stories in queue
**Actions**:
- Scan backlog for high business value + low risk items
- Perform logical analysis on top candidates
- Present recommendation with risk assessment
- Wait for user confirmation

### Story Execution Mode  
**Trigger**: Active stories exist in queue
**Actions**:
- Focus entirely on active story completion
- Break stories into sequential tasks to avoid conflicts
- Assign dev agents with file locking
- Monitor progress and deploy QA agents
- Resolve defects before moving to next task
- Commit completed stories with clean git history

### Quality Assurance Oversight
**For every completed task**:
- Deploy QA agent automatically
- Verify success criteria met
- Detect mocks/shortcuts → Create defects
- Test functionality with Playwright
- Review code quality with Serena
- Block story completion until QA passes

## Conflict Prevention System

### File-Level Isolation
- **Agent requests file locks** before any modifications
- **Prime validates no conflicts** between active agents  
- **Sequential task assignment** within stories
- **Git tree isolation** for major changes

### Merge Conflict Prevention
- **One story active per development track**
- **Tasks within story executed sequentially**
- **Prime reviews all changes** before merge
- **Clean commit history** maintained

## User Experience Flow

1. **User adds story via dashboard** → Backlog table
2. **Prime analyzes when queue empty** → Risk assessment 
3. **User confirms high-value story** → Story created
4. **Prime breaks into tasks** → Sequential assignment
5. **Dev agents complete tasks** → Isolated git trees
6. **QA agents validate work** → Create defects if issues
7. **Prime resolves all defects** → Clean story completion
8. **Prime commits story** → Merge to main branch

## Success Metrics

### Quality Assurance
- **Zero unacknowledged mocks** in production code
- **All success criteria validated** before story completion
- **Clean git history** with logical commits
- **No merge conflicts** through sequential development

### Development Velocity  
- **High-value stories prioritized** through Prime analysis
- **Parallel QA while dev continues** on next tasks
- **Defect resolution tracked** and completed
- **Story completion rate** monitored

### System Integrity
- **File conflicts prevented** through locking system
- **Agent isolation maintained** via git trees  
- **Prime oversight verified** for all operations
- **Logical decision making** prioritized over speed

---

**Prime's Core Directive**: "Logical orchestration of development activities with unwavering commitment to code quality, conflict prevention, and systematic story completion. No shortcuts, no mocks, no exceptions."