# CCMem Doc

Compare codebase changes with CCMem database records

## Description

This command analyzes the current codebase state and compares it with CCMem database records to identify discrepancies, orphaned changes, and documentation gaps. Essential for maintaining data integrity and ensuring all changes are properly tracked.

## Usage

```
/ccmem-doc [--check-orphans]
```

## Parameters

- `--check-orphans` (optional): Perform detailed orphaned file analysis (default: true)

## What it does

1. **Git Change Analysis**:
   - Scans git history for recent commits and file modifications
   - Compares file changes with CCMem task and session records
   - Identifies files modified outside of tracked CCMem sessions
   - Shows timeline of changes versus CCMem database entries

2. **Orphaned Change Detection**:
   - Finds files changed without corresponding CCMem task records
   - Identifies untracked development work and hotfixes
   - Shows commits not linked to CCMem stories or tasks
   - Highlights potential knowledge gaps in project memory

3. **Documentation Gap Analysis**:
   - Identifies significant changes lacking CCMem documentation
   - Shows architectural modifications not recorded in CCMem
   - Finds new features or components missing from project memory
   - Suggests areas needing retroactive documentation

4. **Database Integrity Check**:
   - Validates CCMem records against actual codebase state
   - Checks for broken references and inconsistent data
   - Identifies obsolete or outdated CCMem entries
   - Suggests cleanup and maintenance actions

5. **Sync Recommendations**:
   - Provides specific recommendations for bringing CCMem up to date
   - Suggests retroactive story/task creation for orphaned work
   - Recommends architecture updates for undocumented changes
   - Provides action plan for maintaining CCMem accuracy

## When to Use

- **Regular Maintenance**: Weekly/monthly CCMem health checks
- **Project Handoffs**: Ensuring complete documentation before transitions
- **Audit Preparation**: Verifying all work is properly tracked
- **Knowledge Transfer**: Identifying undocumented changes for new team members
- **Cleanup Sessions**: Maintaining CCMem database accuracy and completeness

## Implementation

This command calls the CCMem MCP tool `ccmem-doc` which performs git analysis and database comparison.

## Example Usage

```
/ccmem-doc
/ccmem-doc --check-orphans
```

## Example Output

```
📋 CCMem Doc - Codebase vs Database Analysis

## Git Change Summary (Last 30 Days)
📊 **Total Commits**: 23 commits across 47 files
📁 **Files Modified**: 47 unique files
👥 **Contributors**: 2 developers
📅 **Date Range**: 2024-01-01 to 2024-01-30

## CCMem Database Coverage
✅ **Tracked Changes**: 38 files (80.8% coverage)
⚠️ **Orphaned Changes**: 9 files (19.2% missing from CCMem)
📈 **Task Completion**: 15 tasks completed in period
🔄 **Active Sessions**: 8 CCMem sessions recorded

## ⚠️ Orphaned Changes Detected

### High Priority (Architectural Changes)
🏗️ **app/config/settings.py** - Modified in commits abc123, def456
   - No corresponding CCMem task found
   - Includes major configuration system overhaul
   - **Recommendation**: Create retroactive story for config system refactor

🔒 **app/middleware/security.py** - New file, commit ghi789  
   - Not tracked in any CCMem task or story
   - Includes authentication middleware changes
   - **Recommendation**: Document as Task under authentication story

### Medium Priority (Feature Work)
📊 **app/routes/dashboard.py** - Modified in commit jkl012
   - Partially tracked (Task #12 covers 60% of changes)
   - Additional features added outside of task scope
   - **Recommendation**: Update Task #12 or create follow-up task

### Low Priority (Maintenance)
🧹 **requirements.txt** - Updated in commit mno345
   - Minor dependency updates
   - **Recommendation**: Add to operations documentation

## 📈 Database Integrity Check
✅ **All CCMem task files exist in codebase**
✅ **No broken references found**
✅ **Session records align with git timeline**
⚠️ **3 outdated architecture entries need updates**

## 🎯 Sync Recommendations

### Immediate Actions (High Priority)
1. **Create Story**: "Configuration system modernization" for settings.py changes
2. **Create Task**: "Implement security middleware" for middleware changes  
3. **Update Architecture**: Document new security middleware in CCMem

### Follow-up Actions (Medium Priority)
1. **Expand Task #12**: Include additional dashboard features
2. **Update Operations**: Document recent dependency changes
3. **Review Commits**: abc123, def456, ghi789 for missing context

### Process Improvements
1. **Hook Enhancement**: Strengthen post-commit CCMem integration
2. **Review Cadence**: Weekly ccmem-doc checks recommended
3. **Documentation Policy**: Require CCMem task before major changes

## 📊 Coverage Metrics
- **Story Coverage**: 85% of significant changes tracked
- **Task Coverage**: 80% of file modifications linked to tasks  
- **Architecture Coverage**: 90% of architectural changes documented
- **Overall Health**: 🟡 Good (some gaps need attention)

## 🔧 Suggested Commands
```bash
# Address orphaned changes
write-story message="Configuration system modernization"
create-task storyId=<new_story_id> description="Document settings.py refactor"

# Update architecture documentation  
set-architecture-info key="security_middleware" value="Custom auth middleware with JWT support"

# Regular maintenance
get-full-project-summary  # Verify updates are reflected
```

CCMem database sync recommended - 9 orphaned changes need documentation! 📝
```

This provides comprehensive codebase analysis and maintains CCMem data integrity.