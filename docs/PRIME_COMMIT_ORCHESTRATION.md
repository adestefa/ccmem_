# Prime Commit Orchestration System

## Overview
Prime orchestrates clean, logical commits after complete story validation, ensuring professional git history and comprehensive testing before integration.

## Commit Orchestration Flow

### 1. Story Completion Detection
```
Story Tasks All Completed → QA All Passed → Defects All Resolved → Prime Commit Analysis
```

### 2. Pre-Commit Validation
- **All tasks completed and QA validated**
- **No open defects for the story** 
- **Success criteria met and verified**
- **Git tree merge analysis passed**
- **No conflicts with main branch**

### 3. Commit Creation
- **Logical commit structure** based on story scope
- **Professional commit messages** following conventional commits
- **Comprehensive change documentation**
- **Automatic version tagging** if applicable

## Prime Commit MCP Tools

### Story Completion Assessment
```typescript
server.tool('ccmem-assess-story-completion', 'Prime assesses if story is ready for commit', {
    story_id: z.number(),
    include_analysis: z.boolean().default(true)
}, async ({ story_id, include_analysis }) => {
    
    // Get story with all related data
    const story = db.prepare(`
        SELECT s.*, b.success_criteria, b.title as backlog_title
        FROM story s
        LEFT JOIN backlog b ON s.created_from_backlog_id = b.id
        WHERE s.id = ?
    `).get(story_id);
    
    if (!story) {
        return { error: 'Story not found' };
    }
    
    // Check all tasks completed
    const taskStatus = db.prepare(`
        SELECT 
            COUNT(*) as total_tasks,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
            COUNT(CASE WHEN qa_status = 'qa_passed' THEN 1 END) as qa_passed_tasks,
            COUNT(CASE WHEN success_criteria_met = 1 THEN 1 END) as criteria_met_tasks
        FROM task WHERE story_id = ?
    `).get(story_id);
    
    // Check open defects
    const defectStatus = db.prepare(`
        SELECT 
            COUNT(*) as total_defects,
            COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_defects
        FROM defect WHERE story_id = ?
    `).get(story_id);
    
    // Git tree analysis
    const gitAnalysis = await callMCPTool('ccmem-prime-merge-analysis', {
        story_id,
        target_branch: 'main'
    });
    
    const assessment = {
        story_id,
        story_title: story.message,
        ready_for_commit: false,
        blocking_issues: [],
        completion_status: {
            tasks_complete: taskStatus.completed_tasks === taskStatus.total_tasks,
            qa_complete: taskStatus.qa_passed_tasks === taskStatus.total_tasks,
            criteria_met: taskStatus.criteria_met_tasks === taskStatus.total_tasks,
            defects_resolved: defectStatus.resolved_defects === defectStatus.total_defects,
            git_ready: gitAnalysis.success && gitAnalysis.recommendation?.decision === 'APPROVE'
        }
    };
    
    // Identify blocking issues
    if (!assessment.completion_status.tasks_complete) {
        const remaining = taskStatus.total_tasks - taskStatus.completed_tasks;
        assessment.blocking_issues.push(`${remaining} tasks not completed`);
    }
    
    if (!assessment.completion_status.qa_complete) {
        const remaining = taskStatus.total_tasks - taskStatus.qa_passed_tasks;
        assessment.blocking_issues.push(`${remaining} tasks failed QA`);
    }
    
    if (!assessment.completion_status.criteria_met) {
        const remaining = taskStatus.total_tasks - taskStatus.criteria_met_tasks;
        assessment.blocking_issues.push(`${remaining} tasks don't meet success criteria`);
    }
    
    if (!assessment.completion_status.defects_resolved) {
        const remaining = defectStatus.total_defects - defectStatus.resolved_defects;
        assessment.blocking_issues.push(`${remaining} defects still open`);
    }
    
    if (!assessment.completion_status.git_ready) {
        assessment.blocking_issues.push('Git merge analysis failed or high risk');
    }
    
    // Overall readiness
    assessment.ready_for_commit = assessment.blocking_issues.length === 0;
    
    if (include_analysis && assessment.ready_for_commit) {
        // Generate commit plan
        const commitPlan = await generateCommitPlan(story_id);
        assessment.commit_plan = commitPlan;
    }
    
    return {
        success: true,
        assessment,
        recommendation: assessment.ready_for_commit ? 
            'APPROVE_COMMIT' : `BLOCK_COMMIT: ${assessment.blocking_issues.join(', ')}`
    };
});
```

### Commit Plan Generation
```typescript
async function generateCommitPlan(storyId: number): Promise<any> {
    // Get story details
    const story = db.prepare(`
        SELECT s.*, b.title, b.description, b.success_criteria
        FROM story s
        LEFT JOIN backlog b ON s.created_from_backlog_id = b.id
        WHERE s.id = ?
    `).get(storyId);
    
    // Get all completed tasks
    const tasks = db.prepare(`
        SELECT * FROM task 
        WHERE story_id = ? AND status = 'completed'
        ORDER BY sequence_order ASC, id ASC
    `).all(storyId);
    
    // Get git changes
    const branchName = `feature/story-${storyId}-dev`;
    const changedFiles = await execGitCommand(
        `git diff --name-only main...${branchName}`
    );
    
    const fileChanges = changedFiles.split('\n').filter(f => f.trim());
    
    // Generate commit message using conventional commits
    const commitType = determineCommitType(story, tasks);
    const scope = determineCommitScope(fileChanges);
    const subject = generateCommitSubject(story, tasks);
    const body = generateCommitBody(story, tasks);
    const footer = generateCommitFooter(story);
    
    return {
        commit_type: commitType,
        scope,
        subject,
        body,
        footer,
        files_changed: fileChanges,
        full_message: formatCommitMessage(commitType, scope, subject, body, footer),
        breaking_change: checkBreakingChange(tasks)
    };
}

function determineCommitType(story: any, tasks: any[]): string {
    // Analyze story and tasks to determine conventional commit type
    const description = `${story.message} ${tasks.map(t => t.description).join(' ')}`.toLowerCase();
    
    if (description.includes('fix') || description.includes('bug') || description.includes('defect')) {
        return 'fix';
    }
    
    if (description.includes('test') || description.includes('spec')) {
        return 'test';
    }
    
    if (description.includes('doc') || description.includes('readme')) {
        return 'docs';
    }
    
    if (description.includes('refactor') || description.includes('restructure')) {
        return 'refactor';
    }
    
    if (description.includes('style') || description.includes('format')) {
        return 'style';
    }
    
    if (description.includes('performance') || description.includes('optimize')) {
        return 'perf';
    }
    
    // Default to feature
    return 'feat';
}

function determineCommitScope(fileChanges: string[]): string {
    // Determine scope based on changed files
    const scopes = new Set();
    
    for (const file of fileChanges) {
        if (file.startsWith('src/api/')) scopes.add('api');
        else if (file.startsWith('src/components/')) scopes.add('ui');
        else if (file.startsWith('src/services/')) scopes.add('service');
        else if (file.startsWith('src/utils/')) scopes.add('utils');
        else if (file.includes('test') || file.includes('spec')) scopes.add('test');
        else if (file.includes('doc')) scopes.add('docs');
        else if (file.includes('config')) scopes.add('config');
        else if (file.includes('db') || file.includes('schema')) scopes.add('db');
    }
    
    if (scopes.size === 1) {
        return Array.from(scopes)[0];
    } else if (scopes.size > 1 && scopes.size <= 3) {
        return Array.from(scopes).join(',');
    } else {
        return 'core'; // Multiple areas affected
    }
}

function generateCommitSubject(story: any, tasks: any[]): string {
    // Generate concise subject line
    const storyTitle = story.title || story.message;
    
    // Clean and truncate to 50 characters
    let subject = storyTitle
        .replace(/^(add|implement|create|build|develop)/i, '')
        .trim()
        .toLowerCase();
    
    if (subject.length > 50) {
        subject = subject.substring(0, 47) + '...';
    }
    
    return subject;
}

function generateCommitBody(story: any, tasks: any[]): string {
    const body = [];
    
    // Story description
    if (story.description) {
        body.push(story.description);
        body.push('');
    }
    
    // Task breakdown
    if (tasks.length > 1) {
        body.push('Implementation details:');
        for (const task of tasks) {
            body.push(`- ${task.description}`);
        }
        body.push('');
    }
    
    // Success criteria met
    if (story.success_criteria) {
        body.push('Success criteria verified:');
        const criteria = story.success_criteria.split('\n').filter(c => c.trim());
        for (const criterion of criteria) {
            body.push(`✓ ${criterion.replace(/^[-*•]\s*/, '')}`);
        }
        body.push('');
    }
    
    return body.join('\n').trim();
}

function generateCommitFooter(story: any): string {
    const footer = [];
    
    // Add story reference
    if (story.created_from_backlog_id) {
        footer.push(`Story-Id: ${story.id}`);
        footer.push(`Backlog-Id: ${story.created_from_backlog_id}`);
    }
    
    // Prime signature
    footer.push('Generated with CCMem Prime Swarm Orchestration System');
    footer.push('Co-Authored-By: Prime <noreply@ccmem.ai>');
    
    return footer.join('\n');
}

function formatCommitMessage(type: string, scope: string, subject: string, body: string, footer: string): string {
    let message = `${type}`;
    
    if (scope) {
        message += `(${scope})`;
    }
    
    message += `: ${subject}`;
    
    if (body) {
        message += `\n\n${body}`;
    }
    
    if (footer) {
        message += `\n\n${footer}`;
    }
    
    return message;
}

function checkBreakingChange(tasks: any[]): boolean {
    const descriptions = tasks.map(t => t.description).join(' ').toLowerCase();
    
    const breakingPatterns = [
        'breaking change',
        'api change',
        'remove',
        'delete',
        'deprecated',
        'incompatible'
    ];
    
    return breakingPatterns.some(pattern => descriptions.includes(pattern));
}
```

### Commit Execution
```typescript
server.tool('ccmem-execute-commit', 'Prime executes commit after validation', {
    story_id: z.number(),
    commit_plan: z.any().optional(),
    dry_run: z.boolean().default(false)
}, async ({ story_id, commit_plan, dry_run }) => {
    
    // Final safety check
    const assessment = await callMCPTool('ccmem-assess-story-completion', {
        story_id,
        include_analysis: false
    });
    
    if (!assessment.assessment?.ready_for_commit) {
        return {
            success: false,
            error: 'Story not ready for commit',
            blocking_issues: assessment.assessment?.blocking_issues || []
        };
    }
    
    // Use provided plan or generate new one
    const plan = commit_plan || await generateCommitPlan(story_id);
    
    if (dry_run) {
        return {
            success: true,
            dry_run: true,
            commit_plan: plan,
            message: 'Commit plan generated successfully'
        };
    }
    
    try {
        const branchName = `feature/story-${story_id}-ready`;
        
        // Switch to ready branch
        await execGitCommand(`git checkout ${branchName}`);
        
        // Stage all changes
        await execGitCommand('git add -A');
        
        // Create commit with generated message
        const commitMessage = plan.full_message;
        await execGitCommand(`git commit -m "${commitMessage}"`);
        
        // Get commit hash
        const commitHash = await execGitCommand('git rev-parse HEAD');
        
        // Record commit in database
        db.prepare(`
            INSERT INTO commits (
                story_id, commit_hash, branch_name, commit_message, 
                files_changed, commit_type, breaking_change
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            story_id, commitHash, branchName, commitMessage,
            JSON.stringify(plan.files_changed), plan.commit_type, plan.breaking_change
        );
        
        // Update story status
        db.prepare(`
            UPDATE story 
            SET status = 'committed', committed_at = datetime('now'), commit_hash = ?
            WHERE id = ?
        `).run(commitHash, story_id);
        
        // Prepare for merge to main
        const mergeReady = await prepareMainMerge(story_id, branchName);
        
        return {
            success: true,
            commit_hash: commitHash,
            branch_name: branchName,
            commit_message: commitMessage,
            files_changed: plan.files_changed.length,
            merge_ready: mergeReady.success,
            next_action: mergeReady.success ? 'ready_for_main_merge' : 'resolve_conflicts'
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: 'Commit execution failed'
        };
    }
});

// Commits tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS commits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL,
    commit_hash TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    commit_message TEXT NOT NULL,
    files_changed TEXT NOT NULL, -- JSON array
    commit_type TEXT NOT NULL, -- feat, fix, docs, etc.
    breaking_change BOOLEAN DEFAULT FALSE,
    merged_to_main BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    merged_at DATETIME NULL,
    FOREIGN KEY (story_id) REFERENCES story(id) ON DELETE CASCADE
  );
`);

async function prepareMainMerge(storyId: number, readyBranch: string): Promise<any> {
    try {
        // Switch to main and update
        await execGitCommand('git checkout main');
        await execGitCommand('git pull origin main');
        
        // Test merge
        const testMerge = await execGitCommand(`git merge --no-commit --no-ff ${readyBranch}`, true);
        
        if (testMerge.includes('CONFLICT')) {
            // Abort test merge
            await execGitCommand('git merge --abort');
            return {
                success: false,
                reason: 'merge_conflicts',
                message: 'Conflicts detected with main branch'
            };
        }
        
        // Abort test merge (we don't want to commit yet)
        await execGitCommand('git merge --abort');
        
        return {
            success: true,
            message: 'Ready for main merge'
        };
        
    } catch (error) {
        return {
            success: false,
            reason: 'merge_test_failed',
            error: error.message
        };
    }
}
```

### Final Main Branch Integration
```typescript
server.tool('ccmem-integrate-to-main', 'Prime integrates completed story to main branch', {
    story_id: z.number(),
    auto_tag: z.boolean().default(true),
    push_to_remote: z.boolean().default(true)
}, async ({ story_id, auto_tag, push_to_remote }) => {
    
    // Verify story is committed and ready
    const story = db.prepare(`
        SELECT * FROM story WHERE id = ? AND status = 'committed'
    `).get(story_id);
    
    if (!story) {
        return {
            success: false,
            error: 'Story not found or not in committed state'
        };
    }
    
    const readyBranch = `feature/story-${story_id}-ready`;
    
    try {
        // Switch to main and update
        await execGitCommand('git checkout main');
        await execGitCommand('git pull origin main');
        
        // Perform the merge
        await execGitCommand(`git merge --no-ff ${readyBranch}`);
        
        // Get merge commit hash
        const mergeCommitHash = await execGitCommand('git rev-parse HEAD');
        
        // Update database
        db.prepare(`
            UPDATE story 
            SET status = 'integrated', integrated_at = datetime('now'),
                merge_commit_hash = ?
            WHERE id = ?
        `).run(mergeCommitHash, story_id);
        
        db.prepare(`
            UPDATE commits 
            SET merged_to_main = TRUE, merged_at = datetime('now')
            WHERE story_id = ?
        `).run(story_id);
        
        // Auto-tagging if requested
        let tagName = null;
        if (auto_tag) {
            tagName = await createVersionTag(story_id);
        }
        
        // Push to remote
        if (push_to_remote) {
            await execGitCommand('git push origin main');
            
            if (tagName) {
                await execGitCommand(`git push origin ${tagName}`);
            }
        }
        
        // Cleanup branches
        await callMCPTool('ccmem-git-tree', {
            action: 'cleanup',
            story_id
        });
        
        return {
            success: true,
            story_id,
            merge_commit: mergeCommitHash,
            tag_created: tagName,
            pushed_to_remote: push_to_remote,
            message: `Story ${story_id} successfully integrated to main`
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Integration to main failed for story ${story_id}`
        };
    }
});

async function createVersionTag(storyId: number): Promise<string | null> {
    try {
        // Simple semantic versioning based on commit type
        const commit = db.prepare(`
            SELECT * FROM commits WHERE story_id = ?
        `).get(storyId);
        
        if (!commit) return null;
        
        // Get latest tag
        const latestTag = await execGitCommand('git describe --tags --abbrev=0', true) || 'v0.0.0';
        
        // Parse version
        const versionMatch = latestTag.match(/v?(\d+)\.(\d+)\.(\d+)/);
        if (!versionMatch) return null;
        
        let [, major, minor, patch] = versionMatch.map(Number);
        
        // Increment based on commit type
        if (commit.breaking_change) {
            major += 1;
            minor = 0;
            patch = 0;
        } else if (commit.commit_type === 'feat') {
            minor += 1;
            patch = 0;
        } else {
            patch += 1;
        }
        
        const newTag = `v${major}.${minor}.${patch}`;
        
        // Create tag
        await execGitCommand(`git tag -a ${newTag} -m "Release ${newTag} - Story ${storyId}"`);
        
        return newTag;
        
    } catch (error) {
        console.error('Tag creation failed:', error);
        return null;
    }
}
```

This commit orchestration system provides:

1. **Complete story validation** before commit
2. **Professional commit messages** following conventional commits
3. **Comprehensive change documentation** 
4. **Safe merge analysis** preventing conflicts
5. **Automatic version tagging** based on change significance
6. **Clean git history** with logical commit structure

Prime ensures every commit represents complete, tested, validated work with no shortcuts or unresolved issues.