#!/usr/bin/env node

import express from 'express';
import Database from 'better-sqlite3';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load portal configuration
const configPath = resolve(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
    console.error('❌ Error: config.json not found. Run install-portal.sh first.');
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
console.log(`🚀 Starting CCMem Portal for ${config.project.displayName}`);
console.log(`📍 Project: ${config.project.path}`);
console.log(`💾 Database: ${config.project.database}`);

const app = express();

// Database connection
const dbPath = resolve(config.project.path, config.project.database);
if (!fs.existsSync(dbPath)) {
    console.error(`❌ Error: Database not found at ${dbPath}`);
    process.exit(1);
}

const db = new Database(dbPath);
console.log(`✅ Connected to database: ${dbPath}`);

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Serve dashboard on base path
app.get(config.server.basePath || '/', (req, res) => {
    // Read dashboard HTML and inject configuration
    const dashboardPath = resolve(__dirname, 'dashboard.html');
    let html = fs.readFileSync(dashboardPath, 'utf8');
    
    // Inject project configuration into HTML
    html = html.replace('{{PROJECT_CONFIG}}', JSON.stringify(config, null, 2));
    html = html.replace('{{PROJECT_TITLE}}', config.server.title);
    html = html.replace('{{BASE_PATH}}', config.server.basePath || '');
    
    res.send(html);
});

// API: Get backlog items
app.get(`${config.server.basePath || ''}/api/backlog`, (req, res) => {
    try {
        const backlogItems = db.prepare('SELECT * FROM backlog ORDER BY display_order ASC, id DESC').all();
        res.json(backlogItems);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error', details: error.message });
    }
});

// API: Update backlog item status
app.post(`${config.server.basePath || ''}/api/backlog/:id/status`, (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const oldItem = db.prepare('SELECT * FROM backlog WHERE id = ?').get(id);
        if (!oldItem) {
            return res.status(404).json({ error: 'Story not found' });
        }
        
        // Update status
        db.prepare('UPDATE backlog SET status = ? WHERE id = ?').run(status, id);
        
        // Log notification
        db.prepare(`
            INSERT INTO prime_notifications (notification_type, backlog_id, change_description, old_value, new_value, user_action)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run('status_change', id, `Status changed from "${oldItem.status}" to "${status}"`, oldItem.status, status, 'manual_update');
        
        res.json({ success: true, message: `Status updated to ${status}` });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Update failed', details: error.message });
    }
});

// API: Launch terminal (if enabled)
if (config.features.terminalIntegration) {
    app.post(`${config.server.basePath || ''}/api/dev/launch-terminal/:id`, (req, res) => {
        try {
            const { id } = req.params;
            const backlogItem = db.prepare('SELECT * FROM backlog WHERE id = ?').get(id);
            
            if (!backlogItem) {
                return res.status(404).json({ error: 'Story not found' });
            }
            
            // Launch Alacritty terminal in project directory
            const terminal = spawn('alacritty', ['--working-directory', config.project.path], {
                detached: true,
                stdio: 'ignore'
            });
            
            terminal.unref();
            
            // Log notification
            db.prepare(`
                INSERT INTO prime_notifications (notification_type, backlog_id, change_description, user_action)
                VALUES (?, ?, ?, ?)
            `).run('dev_terminal_launched', id, `Development terminal launched for "${backlogItem.title}"`, 'terminal_launch');
            
            console.log(`🔧 Terminal launched for Story #${id} in ${config.project.path}`);
            res.json({ 
                success: true, 
                message: `Terminal launched for Story #${id}`,
                project_directory: config.project.path 
            });
        } catch (error) {
            console.error('Error launching terminal:', error);
            res.status(500).json({ error: 'Terminal launch failed', details: error.message });
        }
    });
}

// API: Get Prime notifications
app.get(`${config.server.basePath || ''}/api/notifications`, (req, res) => {
    try {
        const notifications = db.prepare(`
            SELECT * FROM prime_notifications 
            ORDER BY timestamp DESC 
            LIMIT 20
        `).all();
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
    }
});

// API: Get Prime analysis for story
app.get(`${config.server.basePath || ''}/api/analysis/:id`, (req, res) => {
    try {
        const { id } = req.params;
        const analysis = db.prepare('SELECT * FROM prime_analysis WHERE backlog_id = ? ORDER BY analysis_timestamp DESC LIMIT 1').get(id);
        
        if (!analysis) {
            return res.status(404).json({ error: 'No analysis found for this story' });
        }
        
        res.json(analysis);
    } catch (error) {
        console.error('Error fetching analysis:', error);
        res.status(500).json({ error: 'Failed to fetch analysis', details: error.message });
    }
});

// Health check endpoint
app.get(`${config.server.basePath || ''}/api/health`, (req, res) => {
    res.json({ 
        status: 'healthy', 
        project: config.project.name,
        version: config.ccmem.version,
        timestamp: new Date().toISOString()
    });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
});

// Start server
const port = config.server.port;
app.listen(port, () => {
    console.log(`✅ CCMem Portal running for ${config.project.displayName}`);
    console.log(`🌐 Dashboard: http://localhost:${port}${config.server.basePath || ''}`);
    console.log(`🔌 API Base: http://localhost:${port}${config.server.basePath || ''}/api`);
    console.log(`📊 Health Check: http://localhost:${port}${config.server.basePath || ''}/api/health`);
    console.log(`🛑 To stop: ./stop.sh or Ctrl+C`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down CCMem Portal gracefully...');
    db.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Shutting down CCMem Portal gracefully...');
    db.close();
    process.exit(0);
});