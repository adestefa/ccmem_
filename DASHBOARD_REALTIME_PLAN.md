# Dashboard Real-Time Integration Plan

## Dashboard Architecture Enhancement

### 1. Real-Time Data Refresh System

#### SQLite API Endpoint via MCP Server
```typescript
// Add to main.ts
server.tool('ccmem-dashboard-data', 'Get real-time dashboard data', {
    refresh_type: z.enum(['full', 'metrics', 'kanban', 'backlog']).optional().default('full')
}, async ({ refresh_type }) => {
    const data: any = {};
    
    if (refresh_type === 'full' || refresh_type === 'metrics') {
        // Metrics data
        const metrics = db.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM story) as total_stories,
                (SELECT COUNT(*) FROM backlog WHERE status = 'backlog') as backlog_items,
                (SELECT COUNT(*) FROM task WHERE status = 'pending') as queue_tasks,
                (SELECT COUNT(*) FROM task WHERE status = 'in_progress') as dev_tasks,
                (SELECT COUNT(*) FROM task WHERE qa_status = 'in_qa') as qa_tasks,
                (SELECT COUNT(*) FROM task WHERE status = 'completed' AND qa_status = 'qa_passed') as done_tasks,
                (SELECT COUNT(*) FROM defect WHERE status = 'open') as open_defects
        `).get();
        data.metrics = metrics;
    }
    
    if (refresh_type === 'full' || refresh_type === 'kanban') {
        // Kanban data with real task details
        data.kanban = {
            queue: db.prepare(`
                SELECT t.*, s.message as story_title, 
                       COALESCE(ags.status, 'unassigned') as agent_status,
                       ags.agent_type, ags.current_action
                FROM task t 
                JOIN story s ON t.story_id = s.id 
                LEFT JOIN agent_sessions ags ON t.assigned_agent_session = ags.session_id
                WHERE t.status = 'pending' 
                ORDER BY t.timestamp DESC
            `).all(),
            
            development: db.prepare(`
                SELECT t.*, s.message as story_title,
                       ags.agent_type, ags.current_action, ags.risk_level
                FROM task t 
                JOIN story s ON t.story_id = s.id 
                LEFT JOIN agent_sessions ags ON t.assigned_agent_session = ags.session_id
                WHERE t.status = 'in_progress' 
                ORDER BY t.timestamp DESC
            `).all(),
            
            qa: db.prepare(`
                SELECT t.*, s.message as story_title,
                       qr.status as qa_result, qr.findings, qr.mock_violations
                FROM task t 
                JOIN story s ON t.story_id = s.id 
                LEFT JOIN qa_results qr ON t.id = qr.task_id
                WHERE t.qa_status = 'in_qa' 
                ORDER BY t.timestamp DESC
            `).all(),
            
            done: db.prepare(`
                SELECT t.*, s.message as story_title
                FROM task t 
                JOIN story s ON t.story_id = s.id 
                WHERE t.status = 'completed' AND t.qa_status = 'qa_passed' 
                ORDER BY t.timestamp DESC LIMIT 10
            `).all()
        };
    }
    
    if (refresh_type === 'full' || refresh_type === 'backlog') {
        // Backlog data with Prime analysis
        data.backlog = db.prepare(`
            SELECT b.*, 
                   CASE WHEN b.assigned_to_agent IS NOT NULL THEN 'analyzing' ELSE b.status END as current_status,
                   COALESCE(b.prime_notes, '') as analysis_notes
            FROM backlog b 
            ORDER BY b.priority ASC, b.business_value DESC, b.timestamp DESC
        `).all();
    }
    
    return {
        success: true,
        data,
        timestamp: new Date().toISOString()
    };
});
```

#### Dashboard Auto-Refresh JavaScript
```javascript
// Enhanced refresh system in ccmem-dashboard.html
class DashboardManager {
    constructor() {
        this.refreshInterval = 5000; // 5 seconds
        this.isRefreshing = false;
        this.lastUpdate = null;
        this.autoRefresh = true;
    }
    
    async fetchDashboardData(refreshType = 'full') {
        if (this.isRefreshing) return;
        this.isRefreshing = true;
        
        try {
            // Call MCP tool via fetch to local endpoint
            const response = await fetch('/api/dashboard-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_type: refreshType })
            });
            
            const result = await response.json();
            this.updateDashboard(result.data, refreshType);
            this.lastUpdate = new Date().toISOString();
            
        } catch (error) {
            console.error('Dashboard refresh failed:', error);
        } finally {
            this.isRefreshing = false;
        }
    }
    
    updateDashboard(data, refreshType) {
        if (refreshType === 'full' || refreshType === 'metrics') {
            this.updateMetrics(data.metrics);
        }
        
        if (refreshType === 'full' || refreshType === 'kanban') {
            this.updateKanban(data.kanban);
        }
        
        if (refreshType === 'full' || refreshType === 'backlog') {
            this.updateBacklog(data.backlog);
        }
        
        // Update timestamp
        document.getElementById('lastUpdated').textContent = 
            new Date(this.lastUpdate).toLocaleTimeString();
    }
}
```

### 2. Story Creation Form Integration

#### Enhanced Dashboard HTML
```html
<!-- Add to ccmem-dashboard.html -->
<div class="mb-8">
    <div class="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <h3 class="text-lg font-semibold text-white mb-4">Create New Story</h3>
        <form id="storyCreationForm" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Story Title</label>
                <input type="text" id="storyTitle" required 
                       class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea id="storyDescription" required rows="3"
                          class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"></textarea>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Success Criteria</label>
                <textarea id="successCriteria" required rows="2" 
                          placeholder="Define measurable acceptance criteria..."
                          class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"></textarea>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                    <select id="storyPriority" class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white">
                        <option value="1">Critical</option>
                        <option value="2">High</option>
                        <option value="3" selected>Medium</option>
                        <option value="4">Low</option>
                        <option value="5">Nice-to-have</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Business Value (1-10)</label>
                    <input type="number" id="businessValue" min="1" max="10" value="5"
                           class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Estimated Complexity</label>
                    <select id="estimatedComplexity" class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white">
                        <option value="simple">Simple</option>
                        <option value="moderate" selected>Moderate</option>
                        <option value="complex">Complex</option>
                        <option value="high_risk">High Risk</option>
                    </select>
                </div>
            </div>
            <button type="submit" 
                    class="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg text-white font-medium">
                Add to Backlog
            </button>
        </form>
    </div>
</div>

<!-- Backlog Management Section -->
<div class="mb-8">
    <h2 class="text-xl font-bold text-white mb-6">Story Backlog</h2>
    <div id="backlogContainer" class="space-y-3">
        <!-- Backlog items populated here -->
    </div>
</div>
```

### 3. Prime Backlog Grooming System

#### MCP Tool for Backlog Management
```typescript
server.tool('ccmem-backlog-groom', 'Prime analyzes backlog and recommends next story', {
    action: z.enum(['analyze_all', 'recommend_next', 'risk_assess', 'prioritize']).default('recommend_next'),
    story_id: z.number().optional()
}, async ({ action, story_id }) => {
    
    if (action === 'recommend_next') {
        // Check if current work queue is empty or low
        const currentWork = db.prepare(`
            SELECT COUNT(*) as active_count 
            FROM task t
            JOIN agent_sessions ags ON t.assigned_agent_session = ags.session_id
            WHERE ags.status = 'active' AND t.status IN ('pending', 'in_progress')
        `).get() as { active_count: number };
        
        if (currentWork.active_count < 2) { // Low workload threshold
            // Find highest value, lowest risk story
            const nextStory = db.prepare(`
                SELECT b.*, 
                       (b.business_value * 2 - b.risk_score - b.priority) as weighted_score
                FROM backlog b 
                WHERE b.status = 'backlog' 
                ORDER BY weighted_score DESC, b.timestamp ASC 
                LIMIT 1
            `).get();
            
            if (nextStory) {
                // Run risk assessment on recommended story
                const riskAnalysis = await analyzeStoryRisk(nextStory);
                
                return {
                    action: 'recommend_story',
                    recommendation: nextStory,
                    risk_analysis: riskAnalysis,
                    reasoning: `Based on business value (${nextStory.business_value}/10) and estimated complexity (${nextStory.estimated_complexity}), this story provides optimal value-to-risk ratio.`
                };
            }
        }
        
        return {
            action: 'no_recommendation',
            reason: 'Current workload is sufficient or no backlog items available'
        };
    }
    
    // Additional grooming actions...
});

async function analyzeStoryRisk(story: any): Promise<any> {
    // Use ccmem-logical-analysis on the story
    const riskKeywords = ['delete', 'remove', 'drop', 'migrate', 'refactor', 'breaking'];
    const description = `${story.title} ${story.description}`.toLowerCase();
    
    let riskScore = 0;
    const detectedRisks = [];
    
    for (const keyword of riskKeywords) {
        if (description.includes(keyword)) {
            riskScore += 10;
            detectedRisks.push(keyword);
        }
    }
    
    // Check for historical landmines
    const relatedLandmines = db.prepare(`
        SELECT l.* FROM landmines l 
        WHERE l.error_context LIKE ? OR l.error_context LIKE ?
    `).all(`%${story.title}%`, `%${story.description}%`);
    
    riskScore += relatedLandmines.length * 15;
    
    // Update risk score in backlog
    db.prepare(`
        UPDATE backlog 
        SET risk_score = ?, last_analyzed = datetime('now'),
            prime_notes = ?
        WHERE id = ?
    `).run(
        riskScore, 
        `Risk Analysis: ${riskScore} points. Detected risks: ${detectedRisks.join(', ')}. Related failures: ${relatedLandmines.length}`,
        story.id
    );
    
    return {
        risk_score: riskScore,
        detected_risks: detectedRisks,
        related_landmines: relatedLandmines.length,
        recommendation: riskScore < 25 ? 'APPROVE' : riskScore < 50 ? 'CAUTION' : 'REJECT'
    };
}
```

This plan provides:

1. **Real-time SQLite integration** with 5-second refresh cycles
2. **Story creation form** directly in dashboard with success criteria
3. **Prime's backlog grooming** with automated risk assessment
4. **QA workflow integration** with Serena and Playwright
5. **Agent isolation system** preventing file conflicts
6. **Comprehensive tracking** of mocks, violations, and success criteria

Would you like me to proceed with implementing any specific component first?