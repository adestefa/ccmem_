# Git Tree Isolation System Design

## Overview
Prime orchestrates development through isolated git trees, preventing merge conflicts and enabling safe parallel development with sequential integration.

## Git Tree Architecture

### Branch Naming Convention
```
main                                    # Production branch
├── backlog/story-{backlog_id}         # Story analysis branch
├── feature/story-{story_id}-dev       # Development work tree
├── feature/story-{story_id}-qa        # QA testing tree  
├── feature/story-{story_id}-ready     # Prime integration tree
└── feature/story-{story_id}-complete  # Final review tree
```

### Development Flow Through Trees

#### 1. Story Creation Phase
```bash
# Prime creates analysis branch from main
git checkout main
git checkout -b backlog/story-{backlog_id}
# Prime performs risk assessment and planning
```

#### 2. Development Phase  
```bash
# Prime creates dev tree when story approved
git checkout main
git checkout -b feature/story-{story_id}-dev
# Dev agents work in isolated tree
```

#### 3. QA Phase
```bash
# Prime creates QA tree from completed dev work
git checkout feature/story-{story_id}-dev  
git checkout -b feature/story-{story_id}-qa
# QA agents test without affecting dev tree
```

#### 4. Integration Phase
```bash
# Prime creates integration tree for merge analysis
git checkout main
git checkout -b feature/story-{story_id}-ready
git merge feature/story-{story_id}-dev
# Prime analyzes merge conflicts and compatibility
```

## Prime Git Orchestration Tools

### Git Tree Management MCP Tool
```typescript
server.tool('ccmem-git-tree', 'Manage git trees for story isolation', {
    action: z.enum(['create', 'switch', 'merge', 'analyze', 'cleanup']),
    story_id: z.number().optional(),
    tree_type: z.enum(['dev', 'qa', 'ready', 'complete']).optional(),
    source_branch: z.string().optional()
}, async ({ action, story_id, tree_type, source_branch }) => {
    
    if (action === 'create') {
        const branchName = `feature/story-${story_id}-${tree_type}`;
        const sourceBranch = source_branch || 'main';
        
        try {
            // Create isolated branch
            await execGitCommand(`git checkout ${sourceBranch}`);
            await execGitCommand(`git pull origin ${sourceBranch}`);
            await execGitCommand(`git checkout -b ${branchName}`);
            
            // Record tree creation in database
            db.prepare(`
                INSERT INTO git_trees (story_id, branch_name, tree_type, status, created_from)
                VALUES (?, ?, ?, 'active', ?)
            `).run(story_id, branchName, tree_type, sourceBranch);
            
            return {
                success: true,
                branch_name: branchName,
                message: `Created ${tree_type} tree for story ${story_id}`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: `Failed to create ${tree_type} tree for story ${story_id}`
            };
        }
    }
    
    if (action === 'analyze') {
        const branchName = `feature/story-${story_id}-${tree_type}`;
        
        try {
            // Analyze merge potential
            await execGitCommand(`git checkout main`);
            await execGitCommand(`git pull origin main`);
            
            const mergeAnalysis = await execGitCommand(
                `git merge-tree $(git merge-base main ${branchName}) main ${branchName}`
            );
            
            const hasConflicts = mergeAnalysis.includes('<<<<<<<');
            const changedFiles = await execGitCommand(
                `git diff --name-only main...${branchName}`
            );
            
            const analysis = {
                has_conflicts: hasConflicts,
                changed_files: changedFiles.split('\n').filter(f => f.trim()),
                conflict_details: hasConflicts ? mergeAnalysis : null,
                safe_to_merge: !hasConflicts
            };
            
            // Update database with analysis
            db.prepare(`
                UPDATE git_trees 
                SET merge_analysis = ?, last_analyzed = datetime('now')
                WHERE story_id = ? AND tree_type = ?
            `).run(JSON.stringify(analysis), story_id, tree_type);
            
            return {
                success: true,
                analysis,
                recommendation: analysis.safe_to_merge ? 'APPROVE_MERGE' : 'RESOLVE_CONFLICTS'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: `Failed to analyze merge for story ${story_id}`
            };
        }
    }
    
    if (action === 'merge') {
        const sourceBranch = `feature/story-${story_id}-${tree_type}`;
        const targetBranch = source_branch || 'main';
        
        try {
            // Perform safe merge
            await execGitCommand(`git checkout ${targetBranch}`);
            await execGitCommand(`git pull origin ${targetBranch}`);
            await execGitCommand(`git merge --no-ff ${sourceBranch}`);
            
            // Update story status
            db.prepare(`
                UPDATE story SET status = 'completed', completed_at = datetime('now') 
                WHERE id = ?
            `).run(story_id);
            
            // Mark tree as completed
            db.prepare(`
                UPDATE git_trees 
                SET status = 'merged', merged_at = datetime('now')
                WHERE story_id = ? AND tree_type = ?
            `).run(story_id, tree_type);
            
            return {
                success: true,
                message: `Successfully merged story ${story_id} into ${targetBranch}`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: `Merge failed for story ${story_id}`
            };
        }
    }
    
    if (action === 'cleanup') {
        try {
            // Clean up completed branches
            const completedTrees = db.prepare(`
                SELECT branch_name FROM git_trees 
                WHERE story_id = ? AND status = 'merged'
            `).all(story_id);
            
            for (const tree of completedTrees) {
                await execGitCommand(`git branch -D ${tree.branch_name}`);
                await execGitCommand(`git push origin --delete ${tree.branch_name}`, true); // ignore errors
            }
            
            // Update database
            db.prepare(`
                UPDATE git_trees 
                SET status = 'cleaned_up', cleaned_at = datetime('now')
                WHERE story_id = ? AND status = 'merged'
            `).run(story_id);
            
            return {
                success: true,
                message: `Cleaned up branches for story ${story_id}`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: `Cleanup failed for story ${story_id}`
            };
        }
    }
});

// Git Trees table for tracking
db.exec(`
  CREATE TABLE IF NOT EXISTS git_trees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL,
    branch_name TEXT NOT NULL UNIQUE,
    tree_type TEXT NOT NULL, -- dev, qa, ready, complete
    status TEXT DEFAULT 'active', -- active, merged, cleaned_up
    created_from TEXT DEFAULT 'main',
    merge_analysis TEXT NULL, -- JSON of merge analysis
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_analyzed DATETIME NULL,
    merged_at DATETIME NULL,
    cleaned_at DATETIME NULL,
    FOREIGN KEY (story_id) REFERENCES story(id) ON DELETE CASCADE
  );
`);

async function execGitCommand(command: string, ignoreErrors = false): Promise<string> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
        const { stdout, stderr } = await execAsync(command);
        if (stderr && !ignoreErrors) {
            console.warn('Git warning:', stderr);
        }
        return stdout.trim();
    } catch (error) {
        if (ignoreErrors) {
            return '';
        }
        throw error;
    }
}
```

## Sequential Development Strategy

### Story Task Sequencing
```typescript
server.tool('ccmem-sequence-tasks', 'Plan sequential task execution to prevent conflicts', {
    story_id: z.number(),
    auto_sequence: z.boolean().default(true)
}, async ({ story_id, auto_sequence }) => {
    
    // Get all tasks for story
    const tasks = db.prepare(`
        SELECT * FROM task WHERE story_id = ? ORDER BY id ASC
    `).all(story_id);
    
    if (auto_sequence) {
        // Analyze task dependencies automatically
        const sequencedTasks = await analyzeDependencies(tasks);
        
        // Update task sequence numbers
        for (let i = 0; i < sequencedTasks.length; i++) {
            db.prepare(`
                UPDATE task SET sequence_order = ? WHERE id = ?
            `).run(i + 1, sequencedTasks[i].id);
        }
        
        return {
            success: true,
            sequence: sequencedTasks,
            message: `Sequenced ${tasks.length} tasks for story ${story_id}`
        };
    }
    
    return {
        success: true,
        tasks,
        requires_manual_sequencing: true
    };
});

async function analyzeDependencies(tasks: any[]): Promise<any[]> {
    // Analyze task descriptions for file/component dependencies
    const dependencies = new Map();
    
    for (const task of tasks) {
        const deps = extractDependencies(task.description);
        dependencies.set(task.id, deps);
    }
    
    // Sort tasks by dependency order
    const sorted = [];
    const processed = new Set();
    
    function addTask(taskId: number) {
        if (processed.has(taskId)) return;
        
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        // Add dependencies first
        const deps = dependencies.get(taskId) || [];
        for (const depTaskId of deps) {
            addTask(depTaskId);
        }
        
        sorted.push(task);
        processed.add(taskId);
    }
    
    // Process all tasks
    for (const task of tasks) {
        addTask(task.id);
    }
    
    return sorted;
}

function extractDependencies(description: string): number[] {
    // Simple dependency extraction based on keywords
    // In real implementation, this would be more sophisticated
    const deps = [];
    
    if (description.toLowerCase().includes('database')) {
        // Database tasks should come first
        deps.push(-1); // Negative indicates priority
    }
    
    if (description.toLowerCase().includes('api')) {
        // API tasks should come after database
        deps.push(-2);
    }
    
    if (description.toLowerCase().includes('frontend')) {
        // Frontend tasks come last
        deps.push(-3);
    }
    
    return deps;
}
```

## Agent Git Tree Assignment

### Dev Agent Tree Assignment
```typescript
server.tool('ccmem-assign-agent-tree', 'Assign agent to specific git tree', {
    agent_session_id: z.string(),
    story_id: z.number(),
    tree_type: z.enum(['dev', 'qa']),
    task_id: z.number().optional()
}, async ({ agent_session_id, story_id, tree_type, task_id }) => {
    
    const branchName = `feature/story-${story_id}-${tree_type}`;
    
    try {
        // Ensure tree exists
        const treeExists = db.prepare(`
            SELECT * FROM git_trees 
            WHERE story_id = ? AND tree_type = ? AND status = 'active'
        `).get(story_id, tree_type);
        
        if (!treeExists) {
            // Create tree if it doesn't exist
            await callMCPTool('ccmem-git-tree', {
                action: 'create',
                story_id,
                tree_type
            });
        }
        
        // Switch agent to tree
        await execGitCommand(`git checkout ${branchName}`);
        await execGitCommand(`git pull origin ${branchName} || true`); // Ignore if no remote
        
        // Update agent session
        db.prepare(`
            UPDATE agent_sessions 
            SET git_branch = ?, current_action = ?
            WHERE session_id = ?
        `).run(
            branchName, 
            `Working in ${tree_type} tree for story ${story_id}`,
            agent_session_id
        );
        
        // Lock the tree for this agent
        db.prepare(`
            UPDATE git_trees 
            SET locked_by_agent = ?, locked_at = datetime('now')
            WHERE story_id = ? AND tree_type = ?
        `).run(agent_session_id, story_id, tree_type);
        
        return {
            success: true,
            branch_name: branchName,
            message: `Agent ${agent_session_id} assigned to ${tree_type} tree`
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to assign agent to tree`
        };
    }
});
```

## Prime Merge Analysis

### Pre-Merge Safety Check
```typescript
server.tool('ccmem-prime-merge-analysis', 'Prime analyzes git tree for safe merge', {
    story_id: z.number(),
    target_branch: z.string().default('main')
}, async ({ story_id, target_branch }) => {
    
    const devBranch = `feature/story-${story_id}-dev`;
    
    try {
        // Create ready tree for analysis
        await callMCPTool('ccmem-git-tree', {
            action: 'create',
            story_id,
            tree_type: 'ready',
            source_branch: target_branch
        });
        
        const readyBranch = `feature/story-${story_id}-ready`;
        
        // Attempt merge in ready tree
        await execGitCommand(`git checkout ${readyBranch}`);
        const mergeResult = await execGitCommand(`git merge ${devBranch}`, true);
        
        const analysis = {
            story_id,
            merge_successful: !mergeResult.includes('CONFLICT'),
            conflicts: [],
            changed_files: [],
            risk_assessment: {
                file_count: 0,
                complexity_score: 0,
                breaking_change_risk: false
            }
        };
        
        if (analysis.merge_successful) {
            // Analyze changes
            const changedFiles = await execGitCommand(
                `git diff --name-only ${target_branch}...${readyBranch}`
            );
            
            analysis.changed_files = changedFiles.split('\n').filter(f => f.trim());
            analysis.risk_assessment.file_count = analysis.changed_files.length;
            
            // Assess complexity and breaking changes
            for (const file of analysis.changed_files) {
                const diff = await execGitCommand(`git diff ${target_branch}...${readyBranch} -- ${file}`);
                
                // Count lines changed
                const linesChanged = (diff.match(/^[\+\-]/gm) || []).length;
                analysis.risk_assessment.complexity_score += linesChanged;
                
                // Check for breaking changes
                if (diff.includes('DELETE') || diff.includes('DROP') || diff.includes('ALTER')) {
                    analysis.risk_assessment.breaking_change_risk = true;
                }
            }
            
            // Prime's logic-based decision
            const recommendation = calculateMergeRecommendation(analysis.risk_assessment);
            
            return {
                success: true,
                analysis,
                recommendation,
                ready_branch: readyBranch,
                message: `Prime analysis: ${recommendation.decision} - ${recommendation.reasoning}`
            };
            
        } else {
            // Parse conflicts
            const conflictFiles = await execGitCommand(`git diff --name-only --diff-filter=U`);
            analysis.conflicts = conflictFiles.split('\n').filter(f => f.trim());
            
            return {
                success: false,
                analysis,
                recommendation: {
                    decision: 'REJECT',
                    reasoning: `Merge conflicts detected in ${analysis.conflicts.length} files. Manual resolution required.`,
                    conflicts: analysis.conflicts
                }
            };
        }
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: 'Prime merge analysis failed'
        };
    }
});

function calculateMergeRecommendation(riskAssessment: any): any {
    let score = 0;
    let reasoning = [];
    
    // File count scoring
    if (riskAssessment.file_count > 20) {
        score += 30;
        reasoning.push(`High file count (${riskAssessment.file_count})`);
    } else if (riskAssessment.file_count > 10) {
        score += 15;
        reasoning.push(`Moderate file count (${riskAssessment.file_count})`);
    }
    
    // Complexity scoring
    if (riskAssessment.complexity_score > 500) {
        score += 25;
        reasoning.push(`High complexity (${riskAssessment.complexity_score} lines)`);
    } else if (riskAssessment.complexity_score > 200) {
        score += 10;
        reasoning.push(`Moderate complexity (${riskAssessment.complexity_score} lines)`);
    }
    
    // Breaking change penalty
    if (riskAssessment.breaking_change_risk) {
        score += 40;
        reasoning.push('Breaking change patterns detected');
    }
    
    // Prime's decision matrix
    if (score >= 60) {
        return {
            decision: 'REJECT',
            reasoning: `Risk score too high (${score}/100). Issues: ${reasoning.join(', ')}`,
            score
        };
    } else if (score >= 30) {
        return {
            decision: 'CAUTION',
            reasoning: `Medium risk merge (${score}/100). Enhanced testing recommended. Issues: ${reasoning.join(', ')}`,
            score
        };
    } else {
        return {
            decision: 'APPROVE',
            reasoning: `Low risk merge (${score}/100). Safe to proceed.`,
            score
        };
    }
}
```

This git tree isolation system provides:

1. **Complete isolation** of dev/QA/integration work
2. **Sequential development** preventing merge conflicts  
3. **Prime merge analysis** with risk assessment
4. **Automatic conflict detection** and resolution planning
5. **Clean git history** through structured tree management

Prime maintains complete control over the merge process, ensuring no conflicts reach the main branch and all changes are logically analyzed before integration.