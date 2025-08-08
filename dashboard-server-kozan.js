#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database setup
const db = new Database('/Users/corelogic/satori-dev/clients/app-kozan/ccmem.db');

// Enhanced database schema for drag-drop ordering
try {
  db.exec(`ALTER TABLE backlog ADD COLUMN display_order INTEGER DEFAULT 0`);
} catch (e) {
  if (!e.message.includes('duplicate column')) {
    console.error('Error adding display_order column:', e.message);
  }
}

db.exec(`
  -- Create prime_notifications table for change tracking
  CREATE TABLE IF NOT EXISTS prime_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_type TEXT NOT NULL, -- 'backlog_change', 'priority_update', 'reorder', 'new_story'
    backlog_id INTEGER,
    change_description TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    user_action TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (backlog_id) REFERENCES backlog(id) ON DELETE SET NULL
  );
  
  -- Create prime_analysis table for full analysis reports
  CREATE TABLE IF NOT EXISTS prime_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backlog_id INTEGER NOT NULL,
    full_report TEXT NOT NULL,
    risk_assessment TEXT NOT NULL,
    recommendations TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    recommendation_type TEXT NOT NULL,
    analysis_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (backlog_id) REFERENCES backlog(id) ON DELETE CASCADE
  );
`);

// Initialize display_order for existing records
db.exec(`
  UPDATE backlog 
  SET display_order = (
    SELECT ROW_NUMBER() OVER (ORDER BY priority ASC, business_value DESC, timestamp ASC) 
    FROM backlog b2 WHERE b2.id = backlog.id
  )
  WHERE display_order = 0;
`);

console.log('Dashboard HTTP Bridge Server Starting...');
console.log('Database connected and backlog tables ready.');

// API Routes

// Get all backlog items with proper ordering
app.get('/api/backlog', (req, res) => {
  try {
    const backlogItems = db.prepare(`
      SELECT * FROM backlog 
      ORDER BY display_order ASC, priority ASC, business_value DESC
    `).all();
    
    res.json({
      success: true,
      data: backlogItems
    });
  } catch (error) {
    console.error('Error fetching backlog:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add new backlog item
app.post('/api/backlog', (req, res) => {
  try {
    const { title, description, success_criteria, priority, business_value, estimated_complexity } = req.body;
    
    // Get next display order
    const maxOrder = db.prepare('SELECT MAX(display_order) as max_order FROM backlog').get();
    const nextOrder = (maxOrder?.max_order || 0) + 1;
    
    const result = db.prepare(`
      INSERT INTO backlog (
        title, description, success_criteria, priority, 
        business_value, estimated_complexity, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, description, success_criteria, priority, business_value, estimated_complexity, nextOrder);
    
    // Log notification for Prime
    db.prepare(`
      INSERT INTO prime_notifications (
        notification_type, backlog_id, change_description, user_action
      ) VALUES (?, ?, ?, ?)
    `).run(
      'new_story', 
      result.lastInsertRowid,
      `New story created: "${title}" with priority ${priority} and business value ${business_value}`,
      'story_creation'
    );
    
    res.json({
      success: true,
      backlog_id: result.lastInsertRowid,
      message: `Story "${title}" added to backlog`,
      display_order: nextOrder
    });
    
  } catch (error) {
    console.error('Error adding backlog item:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update backlog item priority
app.patch('/api/backlog/:id/priority', (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;
    
    // Get current item
    const currentItem = db.prepare('SELECT * FROM backlog WHERE id = ?').get(id);
    if (!currentItem) {
      return res.status(404).json({ success: false, error: 'Backlog item not found' });
    }
    
    // Update priority
    db.prepare('UPDATE backlog SET priority = ? WHERE id = ?').run(priority, id);
    
    // Log notification for Prime
    db.prepare(`
      INSERT INTO prime_notifications (
        notification_type, backlog_id, change_description, old_value, new_value, user_action
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'priority_update',
      id,
      `Priority changed for "${currentItem.title}"`,
      currentItem.priority.toString(),
      priority.toString(),
      'priority_change'
    );
    
    res.json({
      success: true,
      message: `Priority updated to ${priority}`,
      backlog_id: id
    });
    
  } catch (error) {
    console.error('Error updating priority:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update display order (drag and drop)
app.patch('/api/backlog/reorder', (req, res) => {
  try {
    const { orderedIds } = req.body; // Array of IDs in new order
    
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: 'orderedIds must be an array' });
    }
    
    // Update display_order for each item
    const updateStmt = db.prepare('UPDATE backlog SET display_order = ? WHERE id = ?');
    const transaction = db.transaction((ids) => {
      ids.forEach((id, index) => {
        updateStmt.run(index + 1, id);
      });
    });
    
    transaction(orderedIds);
    
    // Log notification for Prime
    db.prepare(`
      INSERT INTO prime_notifications (
        notification_type, change_description, user_action
      ) VALUES (?, ?, ?)
    `).run(
      'reorder',
      `Backlog reordered - ${orderedIds.length} items repositioned`,
      'drag_drop_reorder'
    );
    
    res.json({
      success: true,
      message: `Reordered ${orderedIds.length} backlog items`,
      new_order: orderedIds
    });
    
  } catch (error) {
    console.error('Error reordering backlog:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get dashboard data (metrics + kanban + backlog)
app.get('/api/dashboard', (req, res) => {
  try {
    const { refresh_type = 'full' } = req.query;
    const data = {};
    
    if (refresh_type === 'full' || refresh_type === 'metrics') {
      const metrics = {
        total_stories: 0, // Will be updated when story table exists
        backlog_items: db.prepare('SELECT COUNT(*) as count FROM backlog').get().count,
        queue_tasks: 0, // Will be updated when task table exists
        dev_tasks: 0,
        qa_tasks: 0,
        done_tasks: 0,
        open_defects: 0
      };
      data.metrics = metrics;
    }
    
    if (refresh_type === 'full' || refresh_type === 'backlog') {
      const backlog = db.prepare(`
        SELECT * FROM backlog 
        ORDER BY display_order ASC, priority ASC, business_value DESC
      `).all();
      data.backlog = backlog;
    }
    
    if (refresh_type === 'full' || refresh_type === 'kanban') {
      // Get stories in different phases from backlog table
      const developmentStories = db.prepare(`
        SELECT * FROM backlog 
        WHERE status = 'in_development' 
        ORDER BY display_order ASC
      `).all();
      
      const queueStories = db.prepare(`
        SELECT * FROM backlog 
        WHERE status = 'queue' 
        ORDER BY display_order ASC
      `).all();
      
      const qaStories = db.prepare(`
        SELECT * FROM backlog 
        WHERE status = 'qa' 
        ORDER BY display_order ASC
      `).all();
      
      const doneStories = db.prepare(`
        SELECT * FROM backlog 
        WHERE status = 'done' 
        ORDER BY display_order ASC
      `).all();
      
      data.kanban = {
        queue: queueStories,
        development: developmentStories,
        qa: qaStories,
        done: doneStories
      };
    }
    
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Prime notifications (for Prime to check changes)
app.get('/api/prime/notifications', (req, res) => {
  try {
    const { unacknowledged_only = 'true' } = req.query;
    
    let query = `
      SELECT pn.*, b.title as story_title 
      FROM prime_notifications pn 
      LEFT JOIN backlog b ON pn.backlog_id = b.id 
    `;
    
    if (unacknowledged_only === 'true') {
      query += 'WHERE pn.acknowledged = FALSE ';
    }
    
    query += 'ORDER BY pn.timestamp DESC LIMIT 50';
    
    const notifications = db.prepare(query).all();
    
    res.json({
      success: true,
      notifications,
      unacknowledged_count: notifications.filter(n => !n.acknowledged).length
    });
    
  } catch (error) {
    console.error('Error fetching Prime notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Acknowledge Prime notifications
app.patch('/api/prime/notifications/acknowledge', (req, res) => {
  try {
    const { notification_ids } = req.body;
    
    if (Array.isArray(notification_ids)) {
      const stmt = db.prepare('UPDATE prime_notifications SET acknowledged = TRUE WHERE id = ?');
      notification_ids.forEach(id => stmt.run(id));
    } else {
      // Acknowledge all
      db.prepare('UPDATE prime_notifications SET acknowledged = TRUE').run();
    }
    
    res.json({
      success: true,
      message: 'Notifications acknowledged'
    });
    
  } catch (error) {
    console.error('Error acknowledging notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Prime analyze story endpoint
app.post('/api/prime/analyze/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Get backlog item
    const backlogItem = db.prepare('SELECT * FROM backlog WHERE id = ?').get(id);
    if (!backlogItem) {
      return res.status(404).json({ success: false, error: 'Backlog item not found' });
    }
    
    // Generate Prime analysis (mock for now - would integrate with actual MCP tools)
    const analysis = generatePrimeAnalysis(backlogItem);
    
    // Save full analysis to database
    db.prepare(`
      INSERT INTO prime_analysis (
        backlog_id, full_report, risk_assessment, recommendations, 
        risk_score, recommendation_type
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      analysis.report, 
      analysis.risk_assessment, 
      analysis.recommendations,
      analysis.risk_score,
      analysis.recommendation
    );
    
    // Update backlog item with Prime notes
    db.prepare('UPDATE backlog SET prime_notes = ?, last_analyzed = CURRENT_TIMESTAMP WHERE id = ?')
      .run(analysis.summary, id);
    
    // Log notification for tracking
    db.prepare(`
      INSERT INTO prime_notifications (
        notification_type, backlog_id, change_description, user_action
      ) VALUES (?, ?, ?, ?)
    `).run(
      'prime_analysis',
      id,
      `Prime analyzed "${backlogItem.title}" - Risk: ${analysis.risk_score}, Recommendation: ${analysis.recommendation}`,
      'prime_analysis'
    );
    
    res.json({
      success: true,
      analysis: {
        report: analysis.report,
        risk_assessment: analysis.risk_assessment,
        recommendations: analysis.recommendations,
        risk_score: analysis.risk_score,
        recommendation: analysis.recommendation
      }
    });
    
  } catch (error) {
    console.error('Error analyzing story with Prime:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get full Prime analysis for a story
app.get('/api/prime/analysis/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the most recent analysis for this backlog item
    const analysis = db.prepare(`
      SELECT * FROM prime_analysis 
      WHERE backlog_id = ? 
      ORDER BY analysis_timestamp DESC 
      LIMIT 1
    `).get(id);
    
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'No Prime analysis found for this story' });
    }
    
    res.json({
      success: true,
      analysis: {
        full_report: analysis.full_report,
        risk_assessment: analysis.risk_assessment,
        recommendations: analysis.recommendations,
        risk_score: analysis.risk_score,
        recommendation_type: analysis.recommendation_type,
        analysis_timestamp: analysis.analysis_timestamp
      }
    });
    
  } catch (error) {
    console.error('Error fetching Prime analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create story from backlog
app.post('/api/story/create-from-backlog', (req, res) => {
  try {
    const { backlog_id, approved_by_prime = false } = req.body;
    
    // Get backlog item
    const backlogItem = db.prepare('SELECT * FROM backlog WHERE id = ?').get(backlog_id);
    if (!backlogItem) {
      return res.status(404).json({ success: false, error: 'Backlog item not found' });
    }
    
    // For now, just update the status to indicate it's moved to development
    // In full implementation, this would create records in story and task tables
    db.prepare('UPDATE backlog SET status = ? WHERE id = ?').run('in_development', backlog_id);
    
    // Log notification
    db.prepare(`
      INSERT INTO prime_notifications (
        notification_type, backlog_id, change_description, user_action
      ) VALUES (?, ?, ?, ?)
    `).run(
      'story_created',
      backlog_id,
      `Story "${backlogItem.title}" moved to development ${approved_by_prime ? '(Prime approved)' : ''}`,
      'story_creation_from_backlog'
    );
    
    res.json({
      success: true,
      message: `Story "${backlogItem.title}" moved to development`,
      story_id: backlog_id, // In full implementation, this would be a new story ID
      approved_by_prime
    });
    
  } catch (error) {
    console.error('Error creating story from backlog:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Prime analysis generation function
function generatePrimeAnalysis(backlogItem) {
  const title = backlogItem.title;
  const description = backlogItem.description;
  const successCriteria = backlogItem.success_criteria;
  const complexity = backlogItem.estimated_complexity;
  const businessValue = backlogItem.business_value;
  
  // Risk assessment based on keywords and complexity
  let riskScore = 0;
  const riskKeywords = ['database', 'delete', 'remove', 'migration', 'security', 'payment', 'authentication', 'admin'];
  const descriptionLower = (description + ' ' + title).toLowerCase();
  
  riskKeywords.forEach(keyword => {
    if (descriptionLower.includes(keyword)) riskScore += 10;
  });
  
  if (complexity === 'complex') riskScore += 15;
  if (complexity === 'high_risk') riskScore += 25;
  
  const riskLevel = riskScore < 25 ? 'LOW' : riskScore < 50 ? 'MEDIUM' : 'HIGH';
  const recommendation = riskScore < 25 ? 'APPROVE' : riskScore < 50 ? 'PROCEED_WITH_CAUTION' : 'REQUIRES_REVIEW';
  
  const report = `## Prime's Logical Analysis

**Story Assessment**: "${title}"

**Business Value**: ${businessValue}/10 - ${
    businessValue >= 8 ? 'High impact feature with significant user value' :
    businessValue >= 6 ? 'Moderate impact with good user benefit' :
    businessValue >= 4 ? 'Lower impact but provides incremental value' :
    'Limited business impact, consider prioritization'
  }

**Technical Complexity**: ${complexity} - ${
    complexity === 'simple' ? 'Straightforward implementation with minimal risk' :
    complexity === 'moderate' ? 'Standard complexity requiring careful planning' :
    complexity === 'complex' ? 'High complexity requiring architectural consideration' :
    'High risk implementation requiring extensive validation'
  }

**Implementation Readiness**: ${
    successCriteria.split('\n').length >= 3 ? 'Well-defined success criteria support clear development path' :
    'Success criteria may need refinement for optimal execution'
  }`;
  
  const riskAssessment = `Risk Level: ${riskLevel} (Score: ${riskScore})

${
    riskScore < 25 ? 'Minimal risk identified. Standard development practices sufficient.' :
    riskScore < 50 ? 'Moderate risk detected. Enhanced testing and review recommended.' :
    'Significant risk factors present. Comprehensive planning and validation required.'
  }`;
  
  const recommendations = `**Prime Recommendation**: ${recommendation}

${
    recommendation === 'APPROVE' ? 'This story demonstrates good value-to-risk ratio and clear implementation path. Proceed with standard development workflow.' :
    recommendation === 'PROCEED_WITH_CAUTION' ? 'Story has merit but contains risk factors. Recommend additional planning phase and enhanced QA protocols.' :
    'Story requires careful analysis before implementation. Consider breaking into smaller, less risky components or implementing additional safeguards.'
  }

**Suggested Next Steps**:
${recommendation === 'APPROVE' ? '• Assign to development team\n• Implement standard testing protocols\n• Monitor for typical completion blockers' :
  recommendation === 'PROCEED_WITH_CAUTION' ? '• Conduct architecture review session\n• Implement enhanced testing strategy\n• Plan rollback procedures' :
  '• Break story into smaller components\n• Identify risk mitigation strategies\n• Consider prototype or proof-of-concept phase'}`;
  
  return {
    report,
    risk_assessment: riskAssessment,
    recommendations,
    risk_score: riskScore,
    recommendation,
    summary: `Prime Analysis: ${riskLevel} risk, ${recommendation.toLowerCase().replace('_', ' ')} - ${businessValue}/10 business value`
  };
}

// Launch Alacritty terminal for development
app.post('/api/dev/launch-terminal/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Get backlog item for context
    const backlogItem = db.prepare('SELECT * FROM backlog WHERE id = ?').get(id);
    if (!backlogItem) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }
    
    // Get current working directory (project root)
    const projectDir = "/Users/corelogic/satori-dev/clients/app-kozan";
    
    // Launch Alacritty terminal in project directory
    const terminal = spawn('alacritty', ['--working-directory', projectDir], {
      detached: true,
      stdio: 'ignore'
    });
    
    terminal.unref(); // Allow parent process to exit independently
    
    // Log notification
    db.prepare(`
      INSERT INTO prime_notifications (
        notification_type, backlog_id, change_description, user_action
      ) VALUES (?, ?, ?, ?)
    `).run(
      'dev_terminal_launched',
      id,
      `Development terminal launched for "${backlogItem.title}" (Story #${id})`,
      'terminal_launch'
    );
    
    res.json({
      success: true,
      message: `Terminal launched for Story #${id}: ${backlogItem.title}`,
      project_directory: projectDir
    });
    
  } catch (error) {
    console.error('Error launching terminal:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve dashboard HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ccmem-dashboard-integrated.html'));
});

// Start server
app.listen(port, () => {
  console.log(`✅ CCMem Dashboard Server running at http://localhost:${port}`);
  console.log(`📊 Dashboard: http://localhost:${port}`);
  console.log(`🔗 API Base: http://localhost:${port}/api`);
  console.log('');
  console.log('🧠 Prime can check notifications at: GET /api/prime/notifications');
  console.log('📱 Dashboard will auto-refresh and save changes to SQLite database');
  console.log('');
  console.log('Ready for full integration with drag-drop, priority editing, and Prime notifications!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Dashboard Server...');
  db.close();
  process.exit(0);
});