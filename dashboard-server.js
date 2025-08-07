#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database setup
const db = new Database('ccmem.db');

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
      // Simplified kanban for now - empty until task table exists
      data.kanban = {
        queue: [],
        development: [],
        qa: [],
        done: []
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