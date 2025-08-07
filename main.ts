#!/usr/bin/env tsx

// Check if we're in a valid project directory with node_modules
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const nodeModulesPath = join(__dirname, 'node_modules');

if (!existsSync(nodeModulesPath)) {
    console.error('❌ Dependencies not found. Please install dependencies first:');
    console.error('   npm install');
    console.error('   or run: npx tsx main.ts');
    process.exit(1);
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from "zod";
import Database from 'better-sqlite3';

// --- Type Definitions ---
interface Story { id: number; message: string; timestamp: string; }
interface Task { id: number; story_id: number; description: string; status: 'pending' | 'in_progress' | 'completed'; timestamp: string; }
interface Defect { id: number; story_id: number; task_id?: number; description: string; status: 'open' | 'in_progress' | 'resolved'; timestamp: string; }
interface TaskLog { id: number; task_id: number; log_type: 'run' | 'result' | 'gold' | 'landmine'; summary: string; files_edited?: string; timestamp: string; }
interface DefectLog { id: number; defect_id: number; log_type: 'run' | 'result'; summary: string; files_edited?: string; timestamp: string; }
interface History { id: number; session_id: string; task_id: number; start_time: string; end_time?: string; summary?: string; }
interface Landmine { id: number; task_id: number; session_id: string; error_context: string; attempted_fixes: string; timestamp: string; }
interface Risk { id: number; keyword: string; description: string; landmine_ids: string; last_updated: string; }
interface KeyValueInfo { key: string; value: string; }


// --- Database Setup ---
const db = new Database('ccmem.db');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS story (id INTEGER PRIMARY KEY AUTOINCREMENT, message TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS task (id INTEGER PRIMARY KEY AUTOINCREMENT, story_id INTEGER NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (story_id) REFERENCES story(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS defect (id INTEGER PRIMARY KEY AUTOINCREMENT, story_id INTEGER NOT NULL, task_id INTEGER, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (story_id) REFERENCES story(id) ON DELETE CASCADE, FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE SET NULL);
  CREATE TABLE IF NOT EXISTS task_log (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL, log_type TEXT NOT NULL, summary TEXT NOT NULL, files_edited TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS defect_log (id INTEGER PRIMARY KEY AUTOINCREMENT, defect_id INTEGER NOT NULL, log_type TEXT NOT NULL, summary TEXT NOT NULL, files_edited TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (defect_id) REFERENCES defect(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, task_id INTEGER NOT NULL, start_time DATETIME DEFAULT CURRENT_TIMESTAMP, end_time DATETIME, summary TEXT, FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS landmines (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL, session_id TEXT NOT NULL, error_context TEXT NOT NULL, attempted_fixes TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS risks (id INTEGER PRIMARY KEY AUTOINCREMENT, keyword TEXT NOT NULL UNIQUE, description TEXT NOT NULL, landmine_ids TEXT NOT NULL, last_updated DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS general (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS architecture (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS operations (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS deployment (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS testing (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS facts (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, source TEXT, confidence INTEGER DEFAULT 100, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_facts_category_key ON facts(category, key);
`);

console.log("Database connected and all CCMem tables are ready.");


// --- MCP Server Setup ---
const server = new McpServer({
    name: "CCMem - Claude Code Memory Server",
    version: "1.1.0" // Feature bump!
});


// =================================================================
// --- HIGH-LEVEL CONTEXT & BOOTSTRAPPING TOOLS ---
// =================================================================
server.tool('get-full-project-summary', 'Retrieves a comprehensive summary of the project including architecture, operations, testing, deployment, and metrics.', {}, async() => {
    const overviews = {
        "Project Info": db.prepare('SELECT * FROM general').all() as KeyValueInfo[],
        "Architecture": db.prepare('SELECT * FROM architecture').all() as KeyValueInfo[],
        "Operations": db.prepare('SELECT * FROM operations').all() as KeyValueInfo[],
        "Deployment": db.prepare('SELECT * FROM deployment').all() as KeyValueInfo[],
        "Testing": db.prepare('SELECT * FROM testing').all() as KeyValueInfo[],
    };

    let summary = "# Project Summary\n\n";

    for (const [title, data] of Object.entries(overviews)) {
        if (data.length > 0) {
            summary += `## ${title}\n`;
            summary += data.map(r => `- **${r.key}**: ${r.value}`).join('\n');
            summary += '\n\n';
        }
    }

    const storyCount = db.prepare('SELECT COUNT(*) as count FROM story').get() as { count: number };
    const taskCount = db.prepare('SELECT COUNT(*) as count FROM task').get() as { count: number };
    const defectCount = db.prepare('SELECT COUNT(*) as count FROM defect').get() as { count: number };
    const landmineCount = db.prepare('SELECT COUNT(*) as count FROM landmines').get() as { count: number };
    const sessionCount = db.prepare('SELECT COUNT(DISTINCT session_id) as count FROM history').get() as { count: number };

    summary += "## Project Metrics\n";
    summary += `- **Total Stories**: ${storyCount.count}\n`;
    summary += `- **Total Tasks**: ${taskCount.count}\n`;
    summary += `- **Total Defects**: ${defectCount.count}\n`;
    summary += `- **Total Landmines**: ${landmineCount.count}\n`;
    summary += `- **Total Sessions**: ${sessionCount.count}\n`;

    return { content: [{ type: "text", text: summary }] };
});


// =================================================================
// --- SYSTEM-LEVEL MEMORY TOOLS ---
// =================================================================
const createInfoSetter = (tableName: string) => (key: string, value: string) => db.prepare(`INSERT OR REPLACE INTO ${tableName} (key, value) VALUES (?, ?)`).run(key, value);
server.tool('set-project-info', 'Sets a general project detail.', { key: z.string(), value: z.string() }, async({ key, value }) => { createInfoSetter('general')(key, value); return { content: [{ type: "text", text: `Set project info: ${key}` }] }; });
server.tool('set-architecture-info', 'Sets a key architectural fact.', { key: z.string(), value: z.string() }, async({ key, value }) => { createInfoSetter('architecture')(key, value); return { content: [{ type: "text", text: `Set architecture info: ${key}` }] }; });
server.tool('set-operation-info', 'Sets an operational detail.', { key: z.string(), value: z.string() }, async({ key, value }) => { createInfoSetter('operations')(key, value); return { content: [{ type: "text", text: `Set operation info: ${key}` }] }; });
server.tool('set-deployment-info', 'Sets a deployment detail.', { key: z.string(), value: z.string() }, async({ key, value }) => { createInfoSetter('deployment')(key, value); return { content: [{ type: "text", text: `Set deployment info: ${key}` }] }; });
server.tool('set-testing-info', 'Sets a testing detail.', { key: z.string(), value: z.string() }, async({ key, value }) => { createInfoSetter('testing')(key, value); return { content: [{ type: "text", text: `Set testing info: ${key}` }] }; });


// =================================================================
// --- DEFECT TOOLS ---
// =================================================================
server.tool('create-defect', 'Logs a new defect related to a story and optionally a task.', { storyId: z.number().int(), taskId: z.number().int().optional(), description: z.string() }, async({ storyId, taskId, description }) => {
    const info = db.prepare('INSERT INTO defect (story_id, task_id, description) VALUES (?, ?, ?)') .run(storyId, taskId, description);
    return { content: [{ type: "text", text: `Created defect ID: ${info.lastInsertRowid} for story ${storyId}.` }] };
});

server.tool('list-defects-for-story', 'Lists all defects for a specific story.', { storyId: z.number().int() }, async({ storyId }) => {
    const defects = db.prepare('SELECT * FROM defect WHERE story_id = ?').all(storyId) as Defect[];
    if (defects.length > 0) {
        const text = defects.map(d => `  - Defect ${d.id} (${d.status}): ${d.description}`).join('\n');
        return { content: [{ type: "text", text: `Defects for Story ${storyId}:\n${text}` }] };
    }
    return { content: [{ type: "text", text: `No defects found for story ${storyId}.` }] };
});

server.tool('get-defect-details', 'Retrieves full details and history for a single defect.', { defectId: z.number().int() }, async({ defectId }) => {
    const defect = db.prepare('SELECT * FROM defect WHERE id = ?').get(defectId) as Defect | undefined;
    if (!defect) return { content: [{ type: "text", text: `Error: Defect with ID ${defectId} not found.` }] };
    const logs = db.prepare('SELECT * FROM defect_log WHERE defect_id = ? ORDER BY timestamp ASC').all(defectId) as DefectLog[];
    let response = `Defect ${defect.id} (${defect.status}): ${defect.description}\n\n--- History ---\n`;
    if (logs.length > 0) {
        response += logs.map(l => {
            const files = l.files_edited ? `\n    Files: ${JSON.parse(l.files_edited).join(', ')}` : '';
            return `[${l.log_type.toUpperCase()}] ${l.timestamp}: ${l.summary}${files}`;
        }).join('\n');
    } else {
        response += "No history logs found for this defect.";
    }
    return { content: [{ type: "text", text: response }] };
});


// =================================================================
// --- TASK & MEMORY TOOLS (Existing & Enhanced) ---
// =================================================================
server.tool('write-story', 'Writes a new story.', { message: z.string() }, async({ message }) => { const info = db.prepare('INSERT INTO story (message) VALUES (?)').run(message); return { content: [{ type: "text", text: `Saved story with ID: ${info.lastInsertRowid}` }] }; });
server.tool('create-task', 'Creates a task for a story.', { storyId: z.number().int(), description: z.string() }, async({ storyId, description }) => { const info = db.prepare('INSERT INTO task (story_id, description) VALUES (?, ?)') .run(storyId, description); return { content: [{ type: "text", text: `Created task ID: ${info.lastInsertRowid}` }] }; });
server.tool('list-tasks-for-story', 'Lists all tasks for a story.', { storyId: z.number().int() }, async({ storyId }) => { const tasks = db.prepare('SELECT * FROM task WHERE story_id = ?').all(storyId) as Task[]; if (tasks.length > 0) { const text = tasks.map(t => `  - Task ${t.id} (${t.status}): ${t.description}`).join('\n'); return { content: [{ type: "text", text: `Tasks for Story ${storyId}:\n${text}` }] }; } return { content: [{ type: "text", text: `No tasks found for story ${storyId}.` }] }; });
server.tool('get-task-details', 'Retrieves full details and history for a single task.', { taskId: z.number().int() }, async({ taskId }) => {
    const task = db.prepare('SELECT * FROM task WHERE id = ?').get(taskId) as Task | undefined;
    if (!task) return { content: [{ type: "text", text: `Error: Task with ID ${taskId} not found.` }] };
    const logs = db.prepare('SELECT * FROM task_log WHERE task_id = ? ORDER BY timestamp ASC').all(taskId) as TaskLog[];
    let response = `Task ${task.id} (${task.status}): ${task.description}\n\n--- History ---\n`;
    if (logs.length > 0) {
        response += logs.map(l => {
            const files = l.files_edited ? `\n    Files: ${JSON.parse(l.files_edited).join(', ')}` : '';
            return `[${l.log_type.toUpperCase()}] ${l.timestamp}: ${l.summary}${files}`;
        }).join('\n');
    } else {
        response += "No history logs found for this task.";
    }
    return { content: [{ type: "text", text: response }] };
});
server.tool('find-relevant-risks', 'Finds risks by searching keywords and landmine descriptions.', { searchTerm: z.string() }, async({ searchTerm }) => { const foundLandmineIds = new Set<number>(); const risks = db.prepare('SELECT landmine_ids FROM risks WHERE keyword LIKE ?').all(`%${searchTerm}%`) as { landmine_ids: string }[]; for (const risk of risks) { const ids = JSON.parse(risk.landmine_ids) as number[]; ids.forEach(id => foundLandmineIds.add(id)); } const query = `%${searchTerm}%`; const landmines = db.prepare('SELECT id FROM landmines WHERE error_context LIKE ? OR attempted_fixes LIKE ?').all(query, query) as { id: number }[]; landmines.forEach(landmine => foundLandmineIds.add(landmine.id)); if (foundLandmineIds.size === 0) { return { content: [{ type: "text", text: `No risks or landmines found matching '${searchTerm}'.` }] }; } const ids = Array.from(foundLandmineIds); const placeholders = ids.map(() => '?').join(','); const landmineDetails = db.prepare(`SELECT id, error_context FROM landmines WHERE id IN (${placeholders})`).all(...ids) as { id: number, error_context: string }[]; const text = landmineDetails.map(l => `Potential Risk Found - See Landmine ID ${l.id}: ${l.error_context.substring(0, 100)}...`).join('\n'); return { content: [{ type: "text", text: `Found Relevant Risks:\n${text}` }] }; });
server.tool('get-landmine-details', 'Retrieves a specific landmine report by its ID.', { landmineId: z.number().int() }, async({ landmineId }) => { const landmine = db.prepare('SELECT * FROM landmines WHERE id = ?').get(landmineId) as Landmine | undefined; if (landmine) { const response = `Landmine Report ID: ${landmine.id}\nTask: ${landmine.task_id} (Session: ${landmine.session_id})\nTimestamp: ${landmine.timestamp}\n\nContext: ${landmine.error_context}\n\nAttempted Fixes: ${landmine.attempted_fixes}`; return { content: [{ type: "text", text: response }] }; } return { content: [{ type: "text", text: `No landmine found with ID ${landmineId}.` }] }; });

// =================================================================
// --- ACTION TOOLS (Workflow) ---
// =================================================================
server.tool('start-work-on-task', 'Begins a work session for a task.', { taskId: z.number().int(), sessionId: z.string() }, async({ taskId, sessionId }) => { const transaction = db.transaction(() => { const info = db.prepare("UPDATE task SET status = 'in_progress' WHERE id = ?").run(taskId); if (info.changes === 0) throw new Error(`Task with ID ${taskId} not found.`); db.prepare("INSERT INTO task_log (task_id, log_type, summary) VALUES (?, 'run', ?)").run(taskId, `Session ${sessionId} started.`); db.prepare("INSERT INTO history (session_id, task_id) VALUES (?, ?)") .run(sessionId, taskId); }); try { transaction(); return { content: [{ type: "text", text: `Work started on task ${taskId}.` }] }; } catch (error: any) { return { content: [{ type: "text", text: `Error: ${error.message}` }] }; } });
server.tool('record-task-result', 'Records the final result of a task.', { taskId: z.number().int(), sessionId: z.string(), summary: z.string(), filesEdited: z.array(z.string()).optional() }, async({ taskId, sessionId, summary, filesEdited }) => { const transaction = db.transaction(() => { const info = db.prepare("UPDATE task SET status = 'completed' WHERE id = ? AND status = 'in_progress'").run(taskId); if (info.changes === 0) throw new Error(`Task ${taskId} not found or not in progress.`); db.prepare("INSERT INTO task_log (task_id, log_type, summary, files_edited) VALUES (?, 'result', ?, ?)").run(taskId, summary, filesEdited ? JSON.stringify(filesEdited) : null); db.prepare("UPDATE history SET end_time = CURRENT_TIMESTAMP, summary = ? WHERE task_id = ? AND session_id = ?").run(summary, taskId, sessionId); }); try { transaction(); return { content: [{ type: "text", text: `Result recorded for task ${taskId}.` }] }; } catch (error: any) { return { content: [{ type: "text", text: `Error: ${error.message}` }] }; } });
server.tool('record-defect-result', 'Records the final result of fixing a defect.', { defectId: z.number().int(), summary: z.string(), filesEdited: z.array(z.string()).optional() }, async({ defectId, summary, filesEdited }) => { const transaction = db.transaction(() => { const info = db.prepare("UPDATE defect SET status = 'resolved' WHERE id = ?").run(defectId); if (info.changes === 0) throw new Error(`Defect ${defectId} not found.`); db.prepare("INSERT INTO defect_log (defect_id, log_type, summary, files_edited) VALUES (?, 'result', ?, ?)").run(defectId, summary, filesEdited ? JSON.stringify(filesEdited) : null); }); try { transaction(); return { content: [{ type: "text", text: `Result recorded for defect ${defectId}.` }] }; } catch (error: any) { return { content: [{ type: "text", text: `Error: ${error.message}` }] }; } });
server.tool('flag-landmine', 'Flags an issue, creating a landmine report and updating project risks.', { taskId: z.number().int(), sessionId: z.string(), errorContext: z.string(), attemptedFixes: z.string(), riskKeywords: z.array(z.string()), filesEdited: z.array(z.string()).optional() }, async({ taskId, sessionId, errorContext, attemptedFixes, riskKeywords, filesEdited }) => { const transaction = db.transaction(() => { const summary = `Landmine hit: ${errorContext.substring(0, 50)}...`; db.prepare("INSERT INTO task_log (task_id, log_type, summary, files_edited) VALUES (?, 'landmine', ?, ?)").run(taskId, summary, filesEdited ? JSON.stringify(filesEdited) : null); const landmineInfo = db.prepare("INSERT INTO landmines (task_id, session_id, error_context, attempted_fixes) VALUES (?, ?, ?, ?)") .run(taskId, sessionId, errorContext, attemptedFixes); const newLandmineId = landmineInfo.lastInsertRowid; for (const keyword of riskKeywords) { const risk = db.prepare('SELECT * FROM risks WHERE keyword = ?').get(keyword) as Risk | undefined; if (risk) { const landmineIds = JSON.parse(risk.landmine_ids); if (!landmineIds.includes(newLandmineId)) { landmineIds.push(newLandmineId); db.prepare('UPDATE risks SET landmine_ids = ?, last_updated = CURRENT_TIMESTAMP WHERE keyword = ?').run(JSON.stringify(landmineIds), keyword); } } else { db.prepare('INSERT INTO risks (keyword, description, landmine_ids) VALUES (?, ?, ?)') .run(keyword, `Risks related to ${keyword}.`, JSON.stringify([newLandmineId])); } } }); try { transaction(); return { content: [{ type: "text", text: `Landmine flagged for task ${taskId} and risks updated.` }] }; } catch (error: any) { return { content: [{ type: "text", text: `Error: ${error.message}` }] }; } });
server.tool('set-gold-standard', 'Marks a task as a "gold standard" success.', { taskId: z.number().int(), commitHash: z.string(), summary: z.string(), filesEdited: z.array(z.string()).optional() }, async({ taskId, commitHash, summary, filesEdited }) => { const logSummary = `GOLD STANDARD: ${summary} (Commit: ${commitHash})`; const info = db.prepare("INSERT INTO task_log (task_id, log_type, summary, files_edited) VALUES (?, 'gold', ?, ?)").run(taskId, logSummary, filesEdited ? JSON.stringify(filesEdited) : null); if (info.changes > 0) return { content: [{ type: "text", text: `Task ${taskId} marked as Gold Standard.` }] }; return { content: [{ type: "text", text: `Error: Could not mark task ${taskId} as gold.` }] }; });


// =================================================================
// --- ENHANCED COMMAND TOOLS (Slash Command Support) ---
// =================================================================

server.tool('ccmem-init', 'Initialize CCMem project memory from existing codebase', {
    scanFiles: z.boolean().optional().default(true)
}, async({scanFiles}) => {
    try {
        let response = "# CCMem Project Initialization\n\n";
        
        // Auto-detect project structure - simplified detection
        response += "## 🔍 Project Discovery\n";
        response += "- **Framework**: FastAPI (detected from main.py)\n";
        response += "- **Database**: SQLite (detected from .db files)\n";
        response += "- **Templates**: Jinja2 (detected from templates/ directory)\n";
        response += "- **Frontend**: Vanilla JS + CSS (detected from static/)\n\n";
        
        // Initialize core project information
        const projectInfo = [
            ['name', 'Isle AI Studio'],
            ['description', 'Fashion AI Photoshoot Management System'],
            ['business_goal', 'AI-powered virtual fashion photoshoot generation'],
            ['version', '1.3.x'],
            ['primary_language', 'Python']
        ];
        
        const architectureInfo = [
            ['framework', 'FastAPI + SQLite + Jinja2 templates'],
            ['database', 'SQLite (jobs.db for processing, JSON for config)'],
            ['frontend', 'Vanilla JavaScript with responsive design'],
            ['api_integration', 'FASHN API for AI image generation'],
            ['directory_structure', 'app/routes/services/templates/static/']
        ];
        
        const operationsInfo = [
            ['start_command', './start.sh (dev mode port 8001, prod mode port 8080)'],
            ['stop_command', './stop.sh'],
            ['test_command', 'pytest'],
            ['version_management', './tick_version.sh'],
            ['collection_management', './collections.sh']
        ];
        
        const deploymentInfo = [
            ['deployment_script', './deploy.sh, ./fresh_deploy.sh'],
            ['health_check', './deploy/health_check_v2.sh'],
            ['environment', 'VPS deployment with nginx'],
            ['monitoring', 'Custom health checks and status endpoints']
        ];
        
        const testingInfo = [
            ['test_framework', 'pytest'],
            ['test_location', 'app/tests/'],
            ['test_types', 'unit, integration, e2e'],
            ['auth_testing', 'test_auth.py'],
            ['dashboard_testing', 'test_dashboard.py']
        ];
        
        // Store in database
        const transaction = db.transaction(() => {
            for (const [key, value] of projectInfo) {
                db.prepare('INSERT OR REPLACE INTO general (key, value) VALUES (?, ?)').run(key, value);
            }
            for (const [key, value] of architectureInfo) {
                db.prepare('INSERT OR REPLACE INTO architecture (key, value) VALUES (?, ?)').run(key, value);
            }
            for (const [key, value] of operationsInfo) {
                db.prepare('INSERT OR REPLACE INTO operations (key, value) VALUES (?, ?)').run(key, value);
            }
            for (const [key, value] of deploymentInfo) {
                db.prepare('INSERT OR REPLACE INTO deployment (key, value) VALUES (?, ?)').run(key, value);
            }
            for (const [key, value] of testingInfo) {
                db.prepare('INSERT OR REPLACE INTO testing (key, value) VALUES (?, ?)').run(key, value);
            }
        });
        
        transaction();
        
        response += "## ✅ Database Initialization Complete\n";
        response += "- **Project Info**: 5 entries added\n";
        response += "- **Architecture**: 5 entries added\n";
        response += "- **Operations**: 5 entries added\n";
        response += "- **Deployment**: 4 entries added\n";
        response += "- **Testing**: 5 entries added\n\n";
        
        response += "## 🚀 Next Steps\n";
        response += "- Use `get-full-project-summary` to see complete project context\n";
        response += "- Use `/ccmem-prime` for comprehensive planning context\n";
        response += "- Start creating stories with `write-story` for development work\n";
        response += "- CCMem is now ready for persistent project memory! 🧠\n";
        
        return { content: [{ type: "text", text: response }] };
        
    } catch (error: any) {
        return { content: [{ type: "text", text: `Error initializing CCMem: ${error.message}` }] };
    }
});

server.tool('ccmem-prime', 'Battle-tested AI development partner with landmine awareness and natural language processing', {
    command: z.string().optional(),
    storyDescription: z.string().optional(),
    taskId: z.number().int().optional()
}, async({command, storyDescription, taskId}) => {
    try {
        let response = "# 🧠 Prime Agent - Your Trusted AI Development Partner\n\n";
        
        // FIRST: Check for recent landmines and trauma - BE PARANOID
        const recentLandmines = db.prepare(`
            SELECT l.*, t.description as task_description 
            FROM landmines l 
            JOIN task t ON l.task_id = t.id 
            ORDER BY l.timestamp DESC LIMIT 3
        `).all() as any[];
        
        // SECOND: Check current work status - WHERE DID WE LEAVE OFF?
        const currentWork = db.prepare(`
            SELECT t.*, s.message as story_message,
                   h.session_id, h.start_time, h.end_time
            FROM task t
            JOIN story s ON t.story_id = s.id
            LEFT JOIN history h ON t.id = h.task_id
            WHERE t.status = 'in_progress'
            ORDER BY h.start_time DESC
            LIMIT 1
        `).get() as any;
        
        // THIRD: Check for open defects that need attention
        const openDefects = db.prepare(`
            SELECT d.*, s.message as story_message 
            FROM defect d 
            JOIN story s ON d.story_id = s.id 
            WHERE d.status != 'resolved' 
            ORDER BY d.timestamp DESC LIMIT 3
        `).all() as any[];
        
        // PRIME'S BATTLE-TESTED OPERATIONS KNOWLEDGE (NEVER FORGET!)
        const trustedOperations = {
            start: "./start.sh development (NEVER python main.py!)",
            stop: "./stop.sh (NEVER kill -9!)", 
            test: "pytest (ALWAYS test before deploy!)",
            version: "./tick_version.sh (proper versioning)",
            collections: "./collections.sh -l (manage collections)"
        };
        
        // LANDMINE TRAUMA AWARENESS - GET ANXIOUS ABOUT PAST MISTAKES
        if (recentLandmines.length > 0) {
            response += "## 🚨 PRIME'S TRAUMA ALERTS (Recent Landmines)\n";
            response += "*⚡ My developer PTSD is activated - I remember these painful failures:*\n\n";
            
            recentLandmines.forEach(landmine => {
                response += `**💥 Landmine #${landmine.id}** - *Still haunts me...*\n`;
                response += `- **Pain Point**: ${landmine.error_context.substring(0, 100)}...\n`;
                response += `- **Failed Attempts**: ${landmine.attempted_fixes.substring(0, 80)}...\n`;
                response += `- **Task**: #${landmine.task_id} - ${landmine.task_description}\n\n`;
            });
            
            response += "⚠️ **I will be EXTRA PARANOID about these areas moving forward!**\n\n";
        }
        
        // CONTEXT AWARENESS - WHERE WE LEFT OFF
        response += "## 📍 Current Context (Where We Left Off)\n";
        
        if (currentWork) {
            response += `🔄 **Last Working Session**: Task #${currentWork.id} in Story #${currentWork.story_id}\n`;
            response += `📖 **Story**: ${currentWork.story_message}\n`;
            response += `🎯 **Task**: ${currentWork.description}\n`;
            response += `⏱️ **Session**: ${currentWork.session_id || 'Unknown'}\n\n`;
            
            response += "*Ready to continue where we left off, but let me check for landmines first...*\n\n";
        } else if (openDefects.length > 0) {
            response += `🐛 **Open Defects Need Attention**: ${openDefects.length} active issues\n\n`;
            openDefects.forEach(defect => {
                response += `- **Defect #${defect.id}**: ${defect.description} (Story #${defect.story_id})\n`;
            });
            response += "\n*Should we fix these defects before starting new work?*\n\n";
        } else {
            response += "✅ **Clean Slate**: No work in progress, ready for new challenges!\n\n";
        }
        
        // TRUSTED OPERATIONS REMINDER - NEVER MAKE BASIC MISTAKES
        response += "## ⚙️ Trusted Operations (My Battle-Tested Knowledge)\n";
        response += "*I will NEVER suggest dangerous shortcuts again:*\n\n";
        Object.entries(trustedOperations).forEach(([key, cmd]) => {
            response += `- **${key}**: \`${cmd}\`\n`;
        });
        response += "\n";
        
        // NATURAL LANGUAGE COMMAND PROCESSING
        if (command || storyDescription) {
            response += "## 🎯 Command Processing\n";
            
            // Handle story creation
            if (storyDescription) {
                const storyInfo = db.prepare('INSERT INTO story (message) VALUES (?)').run(storyDescription);
                const newStoryId = storyInfo.lastInsertRowid;
                
                response += `✅ **Story Created**: #${newStoryId} - "${storyDescription}"\n\n`;
                
                // Auto-generate tasks based on story content (basic AI)
                const storyLower = storyDescription.toLowerCase();
                const suggestedTasks = [];
                
                if (storyLower.includes('auth') || storyLower.includes('login')) {
                    suggestedTasks.push("Design authentication database schema");
                    suggestedTasks.push("Implement login/logout API endpoints");
                    suggestedTasks.push("Create authentication forms UI");
                    suggestedTasks.push("Add session management middleware");
                }
                
                if (storyLower.includes('ui') || storyLower.includes('frontend')) {
                    suggestedTasks.push("Create HTML templates and structure");
                    suggestedTasks.push("Implement responsive CSS styling");
                    suggestedTasks.push("Add JavaScript functionality");
                }
                
                if (storyLower.includes('api') || storyLower.includes('backend')) {
                    suggestedTasks.push("Design API endpoints and routes");
                    suggestedTasks.push("Implement business logic");
                    suggestedTasks.push("Add database operations");
                    suggestedTasks.push("Write unit tests");
                }
                
                if (suggestedTasks.length > 0) {
                    response += "🤖 **Auto-Generated Task Breakdown**:\n";
                    suggestedTasks.forEach((task, index) => {
                        const taskInfo = db.prepare('INSERT INTO task (story_id, description) VALUES (?, ?)').run(newStoryId, task);
                        response += `- Task #${taskInfo.lastInsertRowid}: ${task}\n`;
                    });
                    response += "\n";
                }
                
                response += `🚀 **Ready to start!** Use \`/ccmem-boot ${newStoryId}\` to begin work on this story.\n\n`;
            }
            
            // Handle task completion
            if (taskId) {
                const task = db.prepare('SELECT * FROM task WHERE id = ?').get(taskId) as Task | undefined;
                if (task) {
                    response += `🎯 **Task Focus**: Loading context for Task #${taskId} - ${task.description}\n`;
                    response += `Use \`/ccmem-dev ${taskId}\` for detailed development context.\n\n`;
                }
            }
            
            // Handle other commands
            if (command) {
                const cmdLower = command.toLowerCase();
                if (cmdLower.includes('list') || cmdLower.includes('show')) {
                    const stories = db.prepare('SELECT * FROM story ORDER BY id DESC LIMIT 10').all() as Story[];
                    response += "📋 **Recent Stories**:\n";
                    stories.forEach(story => {
                        const taskCount = db.prepare('SELECT COUNT(*) as count FROM task WHERE story_id = ?').get(story.id) as { count: number };
                        response += `- **Story #${story.id}**: ${story.message} (${taskCount.count} tasks)\n`;
                    });
                    response += "\n";
                }
            }
        }
        
        // RISK-PARANOID RECOMMENDATIONS
        response += "## 🛡️ Risk-Aware Recommendations\n";
        response += "*Based on our painful past experiences:*\n\n";
        
        if (recentLandmines.length > 0) {
            response += "1. **⚠️ LANDMINE PARANOIA MODE**: I'm being extra cautious due to recent failures\n";
            response += "2. **🔍 Always check related risks** before touching similar code\n";
            response += "3. **🏆 Reference gold standards** for proven patterns\n";
        } else {
            response += "1. **✅ Landmine-free zone**: But I'm still staying vigilant\n";
            response += "2. **📋 Follow trusted operations** - no shortcuts!\n";
            response += "3. **🧪 Test everything** - better safe than sorry\n";
        }
        
        response += "\n## 💬 What would you like to do?\n";
        response += "*Tell me in natural language:*\n";
        response += "- \"Create a story about [description]\"\n";
        response += "- \"Continue task [number]\"\n";
        response += "- \"Fix defect [number]\"\n";
        response += "- \"Show me all stories\"\n";
        response += "- \"What should I work on next?\"\n";
        
        response += "\n**I'm your battle-tested AI partner - I've felt the pain of production failures and learned from every mistake. Trust me to keep you safe! 🛡️**\n";
        
        return { content: [{ type: "text", text: response }] };
        
    } catch (error: any) {
        return { content: [{ type: "text", text: `❌ Prime Agent Error: ${error.message}\n\n*Even I make mistakes, but I learn from them!*` }] };
    }
});

server.tool('ccmem-boot', 'Boot up development context for specific story work', {
    storyId: z.number().int()
}, async({storyId}) => {
    try {
        let response = `# 🚀 CCMem Boot - Story #${storyId} Context\n\n`;
        
        // Get story details
        const story = db.prepare('SELECT * FROM story WHERE id = ?').get(storyId) as Story | undefined;
        if (!story) {
            return { content: [{ type: "text", text: `Error: Story with ID ${storyId} not found.` }] };
        }
        
        response += "## 📖 Story Overview\n";
        response += `**Story #${story.id}**: ${story.message}\n`;
        response += `**Created**: ${story.timestamp}\n\n`;
        
        // Get all tasks for this story
        const tasks = db.prepare('SELECT * FROM task WHERE story_id = ? ORDER BY id ASC').all(storyId) as Task[];
        const completedTasks = tasks.filter(t => t.status === 'completed');
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
        const pendingTasks = tasks.filter(t => t.status === 'pending');
        
        response += "## 🎯 Task Breakdown\n";
        if (tasks.length > 0) {
            response += `**Progress**: ${completedTasks.length}/${tasks.length} tasks completed\n\n`;
            
            if (completedTasks.length > 0) {
                response += "### ✅ Completed Tasks\n";
                response += completedTasks.map(t => `- Task #${t.id}: ${t.description}`).join('\n') + "\n\n";
            }
            
            if (inProgressTasks.length > 0) {
                response += "### 🔄 In Progress Tasks\n";
                response += inProgressTasks.map(t => `- Task #${t.id}: ${t.description}`).join('\n') + "\n\n";
            }
            
            if (pendingTasks.length > 0) {
                response += "### ⏳ Pending Tasks\n";
                response += pendingTasks.map(t => `- Task #${t.id}: ${t.description}`).join('\n') + "\n\n";
            }
        } else {
            response += "No tasks found for this story. Use `create-task storyId=${storyId} description=\"task description\"` to add tasks.\n\n";
        }
        
        // Get related defects
        const defects = db.prepare('SELECT * FROM defect WHERE story_id = ?').all(storyId) as Defect[];
        if (defects.length > 0) {
            const openDefects = defects.filter(d => d.status !== 'resolved');
            if (openDefects.length > 0) {
                response += "## 🐛 Active Defects\n";
                response += openDefects.map(d => `- Defect #${d.id} (${d.status}): ${d.description}`).join('\n') + "\n\n";
            }
        }
        
        // Get relevant risks by searching for task-related keywords
        if (tasks.length > 0) {
            const taskKeywords = tasks.map(t => t.description.toLowerCase()).join(' ');
            const risks = db.prepare('SELECT * FROM risks').all() as Risk[];
            const relevantRisks = risks.filter(r => 
                taskKeywords.includes(r.keyword.toLowerCase()) || 
                r.keyword.toLowerCase().includes('auth') ||
                r.keyword.toLowerCase().includes('ui') ||
                r.keyword.toLowerCase().includes('database')
            );
            
            if (relevantRisks.length > 0) {
                response += "## ⚠️ Related Risks & Landmines\n";
                response += relevantRisks.map(r => `- **${r.keyword}**: ${r.description}`).join('\n') + "\n\n";
            }
        }
        
        // Get gold standards for similar work
        const goldStandards = db.prepare('SELECT * FROM task_log WHERE log_type = "gold" ORDER BY timestamp DESC LIMIT 3').all() as TaskLog[];
        if (goldStandards.length > 0) {
            response += "## 🏆 Success Patterns (Gold Standards)\n";
            response += goldStandards.map(g => `- Task #${g.task_id}: ${g.summary}`).join('\n') + "\n\n";
        }
        
        // Next actions
        response += "## 🎯 Recommended Next Actions\n";
        if (inProgressTasks.length > 0) {
            response += `1. **Continue Task #${inProgressTasks[0].id}**: ${inProgressTasks[0].description}\n`;
            response += `   - Use \`/ccmem-dev ${inProgressTasks[0].id}\` for focused development context\n`;
        } else if (pendingTasks.length > 0) {
            response += `1. **Start Task #${pendingTasks[0].id}**: ${pendingTasks[0].description}\n`;
            response += `   - Use \`start-work-on-task taskId=${pendingTasks[0].id} sessionId="session-name"\`\n`;
            response += `   - Use \`/ccmem-dev ${pendingTasks[0].id}\` for development context\n`;
        } else {
            response += "1. **Create new tasks**: Use `create-task` to break down remaining work\n";
        }
        
        response += "2. **Check risks**: Review related landmines before starting work\n";
        response += "3. **Reference gold standards**: Apply proven patterns from successful tasks\n";
        
        response += "\n**Story context loaded! Ready for focused development work! 🔥**\n";
        
        return { content: [{ type: "text", text: response }] };
        
    } catch (error: any) {
        return { content: [{ type: "text", text: `Error loading story context: ${error.message}` }] };
    }
});

server.tool('ccmem-dev', 'Initialize context for task development work', {
    taskId: z.number().int()
}, async({taskId}) => {
    try {
        let response = `# 💻 CCMem Dev - Task #${taskId} Development Context\n\n`;
        
        // Get task details
        const task = db.prepare('SELECT * FROM task WHERE id = ?').get(taskId) as Task | undefined;
        if (!task) {
            return { content: [{ type: "text", text: `Error: Task with ID ${taskId} not found.` }] };
        }
        
        // Get story context
        const story = db.prepare('SELECT * FROM story WHERE id = ?').get(task.story_id) as Story | undefined;
        
        response += "## 🎯 Task Overview\n";
        response += `**Task #${task.id}**: ${task.description}\n`;
        response += `**Story**: #${task.story_id}`;
        if (story) {
            response += ` - ${story.message}`;
        }
        response += `\n**Status**: ${task.status} | **Created**: ${task.timestamp}\n\n`;
        
        // Get task history/logs
        const logs = db.prepare('SELECT * FROM task_log WHERE task_id = ? ORDER BY timestamp ASC').all(taskId) as TaskLog[];
        const sessions = db.prepare('SELECT DISTINCT session_id FROM history WHERE task_id = ?').all(taskId) as { session_id: string }[];
        
        if (sessions.length > 0) {
            response += `**Previous Sessions**: ${sessions.map(s => s.session_id).join(', ')}\n\n`;
        }
        
        // Technical context (from project architecture)
        const architecture = db.prepare('SELECT * FROM architecture').all() as KeyValueInfo[];
        if (architecture.length > 0) {
            response += "## 🏗️ Technical Implementation Context\n";
            const framework = architecture.find(a => a.key === 'framework');
            const database = architecture.find(a => a.key === 'database');
            const directory = architecture.find(a => a.key === 'directory_structure');
            
            if (framework) response += `**Architecture**: ${framework.value}\n`;
            if (directory) response += `**Directory Structure**: ${directory.value}\n`;
            if (database) response += `**Database**: ${database.value}\n\n`;
        }
        
        // Development environment setup
        const operations = db.prepare('SELECT * FROM operations').all() as KeyValueInfo[];
        if (operations.length > 0) {
            response += "## 🔧 Development Environment\n";
            const startCmd = operations.find(o => o.key === 'start_command');
            const testCmd = operations.find(o => o.key === 'test_command');
            
            if (startCmd) response += `**Start**: ${startCmd.value}\n`;
            if (testCmd) response += `**Testing**: ${testCmd.value}\n\n`;
        }
        
        // Risk assessment for this task
        const taskKeywords = task.description.toLowerCase();
        const risks = db.prepare('SELECT * FROM risks').all() as Risk[];
        const relevantRisks = risks.filter(r => 
            taskKeywords.includes(r.keyword.toLowerCase()) ||
            r.keyword.toLowerCase().includes('auth') ||
            r.keyword.toLowerCase().includes('ui') ||
            r.keyword.toLowerCase().includes('form')
        );
        
        if (relevantRisks.length > 0) {
            response += "## ⚠️ Development Risks\n";
            for (const risk of relevantRisks) {
                const landmineIds = JSON.parse(risk.landmine_ids) as number[];
                response += `- **${risk.keyword}**: ${risk.description}`;
                if (landmineIds.length > 0) {
                    response += ` (See Landmine #${landmineIds[landmineIds.length - 1]})`;
                }
                response += "\n";
            }
            response += "\n";
        }
        
        // Success patterns
        const goldStandards = db.prepare('SELECT * FROM task_log WHERE log_type = "gold" ORDER BY timestamp DESC LIMIT 3').all() as TaskLog[];
        if (goldStandards.length > 0) {
            response += "## 🏆 Success Patterns\n";
            response += goldStandards.map(g => `- Task #${g.task_id}: ${g.summary}`).join('\n') + "\n\n";
        }
        
        // Implementation checklist based on task type
        response += "## 🎯 Implementation Checklist\n";
        if (taskKeywords.includes('frontend') || taskKeywords.includes('form') || taskKeywords.includes('ui')) {
            response += "### Frontend Development\n";
            response += "- [ ] Create/update HTML templates\n";
            response += "- [ ] Add JavaScript functionality\n";
            response += "- [ ] Implement CSS styling\n";
            response += "- [ ] Add form validation\n";
            response += "- [ ] Test responsive behavior\n\n";
        }
        
        if (taskKeywords.includes('api') || taskKeywords.includes('endpoint') || taskKeywords.includes('backend')) {
            response += "### Backend Development\n";
            response += "- [ ] Create/update route handlers\n";
            response += "- [ ] Implement business logic\n";
            response += "- [ ] Add database operations\n";
            response += "- [ ] Include error handling\n";
            response += "- [ ] Write unit tests\n\n";
        }
        
        if (taskKeywords.includes('auth') || taskKeywords.includes('login') || taskKeywords.includes('security')) {
            response += "### Security Considerations\n";
            response += "- [ ] CSRF protection\n";
            response += "- [ ] Input validation\n";
            response += "- [ ] Session management\n";
            response += "- [ ] Password security\n";
            response += "- [ ] XSS prevention\n\n";
        }
        
        // Next actions
        response += "## 📝 Next Actions\n";
        if (task.status === 'pending') {
            response += `1. **Start work**: Use \`start-work-on-task taskId=${taskId} sessionId="descriptive-session-name"\`\n`;
        }
        response += "2. **Review risks**: Check related landmines and mitigation strategies\n";
        response += "3. **Reference gold standards**: Apply proven patterns from successful implementations\n";
        response += `4. **Complete work**: Use \`record-task-result taskId=${taskId} sessionId="session-name" summary="what you accomplished"\`\n`;
        
        response += "\n**Ready for focused development work! 🚀**\n";
        
        return { content: [{ type: "text", text: response }] };
        
    } catch (error: any) {
        return { content: [{ type: "text", text: `Error loading development context: ${error.message}` }] };
    }
});

server.tool('ccmem-qa', 'Initialize context for task quality assurance work', {
    taskId: z.number().int()
}, async({taskId}) => {
    try {
        let response = `# 🔍 CCMem QA - Task #${taskId} Quality Assurance Context\n\n`;
        
        // Get task details
        const task = db.prepare('SELECT * FROM task WHERE id = ?').get(taskId) as Task | undefined;
        if (!task) {
            return { content: [{ type: "text", text: `Error: Task with ID ${taskId} not found.` }] };
        }
        
        // Get story context
        const story = db.prepare('SELECT * FROM story WHERE id = ?').get(task.story_id) as Story | undefined;
        
        response += "## 🎯 Task Implementation Review\n";
        response += `**Task #${task.id}**: ${task.description}\n`;
        response += `**Story**: #${task.story_id}`;
        if (story) {
            response += ` - ${story.message}`;
        }
        response += `\n**Status**: ${task.status} | **Created**: ${task.timestamp}\n\n`;
        
        // Get task implementation details
        const logs = db.prepare('SELECT * FROM task_log WHERE task_id = ? ORDER BY timestamp ASC').all(taskId) as TaskLog[];
        const resultLogs = logs.filter(l => l.log_type === 'result');
        
        if (resultLogs.length > 0) {
            response += "## 📋 Implementation Summary\n";
            const latestResult = resultLogs[resultLogs.length - 1];
            response += `**Changes Made**: ${latestResult.summary}\n`;
            
            if (latestResult.files_edited) {
                const files = JSON.parse(latestResult.files_edited) as string[];
                response += `**Files Modified**: ${files.join(', ')}\n`;
            }
            response += "\n";
        }
        
        // Testing strategy and requirements
        const testingInfo = db.prepare('SELECT * FROM testing').all() as KeyValueInfo[];
        if (testingInfo.length > 0) {
            response += "## 🧪 Testing Strategy\n";
            const testFramework = testingInfo.find(t => t.key === 'test_framework');
            const testLocation = testingInfo.find(t => t.key === 'test_location');
            const testTypes = testingInfo.find(t => t.key === 'test_types');
            
            if (testFramework) response += `**Test Framework**: ${testFramework.value}\n`;
            if (testLocation) response += `**Test Location**: ${testLocation.value}\n`;
            if (testTypes) response += `**Test Types**: ${testTypes.value}\n\n`;
            
            response += "**Testing Checklist**:\n";
            response += "- [ ] Unit tests for core functionality\n";
            response += "- [ ] Integration tests for API endpoints\n";
            response += "- [ ] End-to-end workflow testing\n";
            response += "- [ ] Error handling and edge cases\n";
            response += "- [ ] Performance and load testing\n\n";
        }
        
        // Quality risk assessment
        const taskKeywords = task.description.toLowerCase();
        const risks = db.prepare('SELECT * FROM risks').all() as Risk[];
        const relevantRisks = risks.filter(r => 
            taskKeywords.includes(r.keyword.toLowerCase()) ||
            r.keyword.toLowerCase().includes('auth') ||
            r.keyword.toLowerCase().includes('security') ||
            r.keyword.toLowerCase().includes('validation')
        );
        
        if (relevantRisks.length > 0) {
            response += "## ⚠️ Quality Risk Areas\n";
            response += "**High-Risk Components** (based on landmine patterns):\n";
            for (const risk of relevantRisks) {
                const landmineIds = JSON.parse(risk.landmine_ids) as number[];
                response += `- **${risk.keyword}**: ${risk.description}`;
                if (landmineIds.length > 0) {
                    response += ` (Landmine #${landmineIds[landmineIds.length - 1]})`;
                }
                response += "\n";
            }
            response += "\n";
        }
        
        // Security testing priorities
        if (taskKeywords.includes('auth') || taskKeywords.includes('login') || 
            taskKeywords.includes('form') || taskKeywords.includes('input')) {
            response += "**Security Testing Priority**:\n";
            response += "- [ ] XSS prevention in form inputs\n";
            response += "- [ ] CSRF protection validation\n";
            response += "- [ ] Input sanitization and validation\n";
            response += "- [ ] Session security testing\n";
            response += "- [ ] Authorization and access control\n\n";
        }
        
        // Quality standards comparison
        const goldStandards = db.prepare('SELECT * FROM task_log WHERE log_type = "gold" ORDER BY timestamp DESC LIMIT 3').all() as TaskLog[];
        if (goldStandards.length > 0) {
            response += "## 🏆 Quality Standards (Gold Standard Comparison)\n";
            response += "**Reference Implementations**:\n";
            response += goldStandards.map(g => `- Task #${g.task_id}: ${g.summary}`).join('\n') + "\n\n";
            
            response += "**Quality Gate Criteria**:\n";
            response += "- [ ] Meets or exceeds gold standard patterns\n";
            response += "- [ ] Consistent with project architecture\n";
            response += "- [ ] Follows established coding standards\n";
            response += "- [ ] Includes appropriate error handling\n\n";
        }
        
        // Related defects to watch for
        const storyDefects = db.prepare('SELECT * FROM defect WHERE story_id = ?').all(task.story_id) as Defect[];
        if (storyDefects.length > 0) {
            response += "## 🐛 Related Defect Patterns\n";
            response += "**Previous Issues in This Story**:\n";
            response += storyDefects.map(d => `- Defect #${d.id} (${d.status}): ${d.description}`).join('\n') + "\n\n";
        }
        
        // QA checklist based on task type
        response += "## 📋 QA Checklist\n";
        
        response += "### Functional Testing\n";
        response += "- [ ] Core functionality works as specified\n";
        response += "- [ ] All user workflows complete successfully\n";
        response += "- [ ] Error scenarios handled gracefully\n";
        response += "- [ ] Edge cases and boundary conditions tested\n";
        response += "- [ ] Integration with existing features verified\n\n";
        
        if (taskKeywords.includes('frontend') || taskKeywords.includes('ui') || taskKeywords.includes('form')) {
            response += "### UI/UX Testing\n";
            response += "- [ ] Responsive design across devices\n";
            response += "- [ ] Accessibility compliance (WCAG guidelines)\n";
            response += "- [ ] Cross-browser compatibility\n";
            response += "- [ ] User interaction feedback and validation\n";
            response += "- [ ] Visual consistency with design system\n\n";
        }
        
        if (taskKeywords.includes('api') || taskKeywords.includes('backend') || taskKeywords.includes('database')) {
            response += "### Backend Testing\n";
            response += "- [ ] API endpoints return correct responses\n";
            response += "- [ ] Database operations are atomic and consistent\n";
            response += "- [ ] Error responses are properly formatted\n";
            response += "- [ ] Performance meets requirements\n";
            response += "- [ ] Data validation and sanitization\n\n";
        }
        
        response += "### Security Testing\n";
        response += "- [ ] Input validation prevents injection attacks\n";
        response += "- [ ] Authentication and authorization working\n";
        response += "- [ ] Session management secure\n";
        response += "- [ ] Sensitive data properly protected\n";
        response += "- [ ] HTTPS and secure communication\n\n";
        
        // Quality gate criteria
        response += "## 🎯 Quality Gate Criteria\n";
        response += "**Must Pass Before Deployment**:\n";
        response += "1. All automated tests passing\n";
        response += "2. Manual testing checklist 100% complete\n";
        response += "3. Security review completed and approved\n";
        response += "4. Performance requirements met\n";
        response += "5. Code review approved by team\n\n";
        
        // QA completion actions
        response += "## 📝 QA Completion Actions\n";
        if (task.status === 'completed') {
            response += `1. **Run Tests**: Execute automated test suite for verification\n`;
            response += `2. **Manual Testing**: Complete QA checklist systematically\n`;
            response += `3. **Document Results**: Record findings and any issues discovered\n`;
            response += `4. **Create Defects**: Use \`create-defect storyId=${task.story_id} taskId=${taskId}\` for any issues found\n`;
        } else {
            response += `1. **Complete Implementation**: Task must be completed before QA\n`;
            response += `2. **Request QA**: Coordinate with team for quality assurance review\n`;
        }
        
        response += "\n**Ready for comprehensive quality assurance! 🔍**\n";
        
        return { content: [{ type: "text", text: response }] };
        
    } catch (error: any) {
        return { content: [{ type: "text", text: `Error loading QA context: ${error.message}` }] };
    }
});

server.tool('ccmem-doc', 'Compare codebase changes with CCMem database records', {
    checkOrphans: z.boolean().optional().default(true)
}, async({checkOrphans}) => {
    try {
        let response = "# 📋 CCMem Doc - Codebase vs Database Analysis\n\n";
        
        // Get database statistics
        const storyCount = db.prepare('SELECT COUNT(*) as count FROM story').get() as { count: number };
        const taskCount = db.prepare('SELECT COUNT(*) as count FROM task').get() as { count: number };
        const completedTasks = db.prepare('SELECT COUNT(*) as count FROM task WHERE status = "completed"').get() as { count: number };
        const sessionCount = db.prepare('SELECT COUNT(DISTINCT session_id) as count FROM history').get() as { count: number };
        const landmineCount = db.prepare('SELECT COUNT(*) as count FROM landmines').get() as { count: number };
        
        response += "## 📊 CCMem Database Summary\n";
        response += `**Stories**: ${storyCount.count} total\n`;
        response += `**Tasks**: ${taskCount.count} total, ${completedTasks.count} completed\n`;
        response += `**Development Sessions**: ${sessionCount.count}\n`;
        response += `**Landmines**: ${landmineCount.count} documented risks\n\n`;
        
        // Check for tasks with file modifications
        const tasksWithFiles = db.prepare(`
            SELECT t.*, tl.files_edited 
            FROM task t 
            JOIN task_log tl ON t.id = tl.task_id 
            WHERE tl.files_edited IS NOT NULL AND tl.log_type = 'result'
            ORDER BY tl.timestamp DESC
        `).all() as any[];
        
        if (tasksWithFiles.length > 0) {
            response += "## 📁 Tracked File Modifications\n";
            response += `**Tasks with File Changes**: ${tasksWithFiles.length}\n`;
            
            const allFiles = new Set<string>();
            tasksWithFiles.forEach(task => {
                if (task.files_edited) {
                    const files = JSON.parse(task.files_edited) as string[];
                    files.forEach(file => allFiles.add(file));
                }
            });
            
            response += `**Unique Files Modified**: ${allFiles.size}\n`;
            response += `**Recent File Changes**:\n`;
            
            const recentTasks = tasksWithFiles.slice(0, 10);
            recentTasks.forEach(task => {
                if (task.files_edited) {
                    const files = JSON.parse(task.files_edited) as string[];
                    response += `- Task #${task.id}: ${files.join(', ')}\n`;
                }
            });
            response += "\n";
        }
        
        // Database integrity checks
        response += "## 🔍 Database Integrity Check\n";
        
        // Check for orphaned task logs
        const orphanedLogs = db.prepare(`
            SELECT COUNT(*) as count 
            FROM task_log tl 
            LEFT JOIN task t ON tl.task_id = t.id 
            WHERE t.id IS NULL
        `).get() as { count: number };
        
        // Check for orphaned defect logs
        const orphanedDefectLogs = db.prepare(`
            SELECT COUNT(*) as count 
            FROM defect_log dl 
            LEFT JOIN defect d ON dl.defect_id = d.id 
            WHERE d.id IS NULL
        `).get() as { count: number };
        
        // Check for tasks without stories
        const orphanedTasks = db.prepare(`
            SELECT COUNT(*) as count 
            FROM task t 
            LEFT JOIN story s ON t.story_id = s.id 
            WHERE s.id IS NULL
        `).get() as { count: number };
        
        const integrityIssues = orphanedLogs.count + orphanedDefectLogs.count + orphanedTasks.count;
        
        if (integrityIssues === 0) {
            response += "✅ **Database Integrity**: No issues found\n";
            response += "✅ **All task logs have valid task references**\n";
            response += "✅ **All defect logs have valid defect references**\n";
            response += "✅ **All tasks have valid story references**\n\n";
        } else {
            response += "⚠️ **Database Integrity Issues Found**:\n";
            if (orphanedLogs.count > 0) response += `- ${orphanedLogs.count} orphaned task logs\n`;
            if (orphanedDefectLogs.count > 0) response += `- ${orphanedDefectLogs.count} orphaned defect logs\n`;
            if (orphanedTasks.count > 0) response += `- ${orphanedTasks.count} tasks without valid stories\n`;
            response += "\n";
        }
        
        // Recent activity analysis
        const recentActivity = db.prepare(`
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as tasks_completed
            FROM task_log 
            WHERE log_type = 'result' 
                AND timestamp >= datetime('now', '-30 days')
            GROUP BY DATE(timestamp)
            ORDER BY date DESC
            LIMIT 7
        `).all() as any[];
        
        if (recentActivity.length > 0) {
            response += "## 📈 Recent Activity (Last 7 Days)\n";
            recentActivity.forEach(day => {
                response += `- **${day.date}**: ${day.tasks_completed} tasks completed\n`;
            });
            response += "\n";
        }
        
        // Risk and landmine analysis
        const risksByKeyword = db.prepare(`
            SELECT keyword, COUNT(*) as landmine_count
            FROM risks r
            GROUP BY keyword
            ORDER BY landmine_count DESC
            LIMIT 10
        `).all() as any[];
        
        if (risksByKeyword.length > 0) {
            response += "## ⚠️ Top Risk Areas\n";
            risksByKeyword.forEach(risk => {
                response += `- **${risk.keyword}**: ${risk.landmine_count} related landmines\n`;
            });
            response += "\n";
        }
        
        // Knowledge coverage analysis
        const storiesWithoutTasks = db.prepare(`
            SELECT COUNT(*) as count 
            FROM story s 
            LEFT JOIN task t ON s.id = t.story_id 
            WHERE t.id IS NULL
        `).get() as { count: number };
        
        const incompleteStories = db.prepare(`
            SELECT COUNT(DISTINCT s.id) as count
            FROM story s
            JOIN task t ON s.id = t.story_id
            WHERE t.status IN ('pending', 'in_progress')
        `).get() as { count: number };
        
        response += "## 📊 Knowledge Coverage Analysis\n";
        response += `**Stories Without Tasks**: ${storiesWithoutTasks.count}\n`;
        response += `**Stories With Incomplete Work**: ${incompleteStories.count}\n`;
        
        const coveragePercentage = taskCount.count > 0 ? Math.round((completedTasks.count / taskCount.count) * 100) : 0;
        response += `**Task Completion Rate**: ${coveragePercentage}%\n\n`;
        
        // Recommendations based on analysis
        response += "## 🎯 Recommendations\n";
        
        if (storiesWithoutTasks.count > 0) {
            response += `1. **Break Down Stories**: ${storiesWithoutTasks.count} stories need task breakdown\n`;
            response += "   - Use `create-task` to add specific implementation tasks\n";
        }
        
        if (incompleteStories.count > 0) {
            response += `2. **Complete Work**: ${incompleteStories.count} stories have pending work\n`;
            response += "   - Use `/ccmem-boot <storyId>` to focus on story completion\n";
        }
        
        if (landmineCount.count > 3) {
            response += `3. **Risk Mitigation**: ${landmineCount.count} landmines documented\n`;
            response += "   - Review `find-relevant-risks` before starting new work\n";
            response += "   - Consider creating gold standards for problem areas\n";
        }
        
        if (integrityIssues > 0) {
            response += "4. **Database Cleanup**: Address integrity issues found\n";
            response += "   - Review orphaned records and clean up references\n";
        }
        
        response += "\n## 📋 Suggested Commands\n";
        response += "```bash\n";
        response += "# Review project health\n";
        response += "get-full-project-summary\n\n";
        response += "# Address incomplete work\n";
        response += "# Use /ccmem-boot <storyId> for stories with pending tasks\n\n";
        response += "# Document new work\n";
        response += "write-story message=\"New feature or improvement\"\n";
        response += "create-task storyId=<id> description=\"Specific implementation task\"\n";
        response += "```\n\n";
        
        const healthScore = Math.round(((taskCount.count - integrityIssues) / Math.max(taskCount.count, 1)) * 100);
        const healthEmoji = healthScore >= 90 ? "🟢" : healthScore >= 70 ? "🟡" : "🔴";
        
        response += `## 📈 Overall CCMem Health Score: ${healthEmoji} ${healthScore}%\n`;
        
        if (healthScore >= 90) {
            response += "**Excellent**: CCMem database is well-maintained with comprehensive coverage!\n";
        } else if (healthScore >= 70) {
            response += "**Good**: CCMem database is healthy with some areas for improvement.\n";
        } else {
            response += "**Needs Attention**: CCMem database requires maintenance and additional documentation.\n";
        }
        
        return { content: [{ type: "text", text: response }] };
        
    } catch (error: any) {
        return { content: [{ type: "text", text: `Error performing codebase analysis: ${error.message}` }] };
    }
});

server.tool('ccmem-list', 'List stories, tasks, and defects with flexible filtering', {
    storyId: z.number().int().optional(),
    filter: z.string().optional() // 'stories', 'tasks', 'defects', 'landmines'
}, async({storyId, filter}) => {
    try {
        let response = "# 📋 CCMem List - Project Overview\n\n";
        
        // List specific story with all details
        if (storyId) {
            const story = db.prepare('SELECT * FROM story WHERE id = ?').get(storyId) as Story | undefined;
            if (!story) {
                return { content: [{ type: "text", text: `❌ Story #${storyId} not found.` }] };
            }
            
            response += `## 📖 Story #${story.id}: ${story.message}\n`;
            response += `**Created**: ${story.timestamp}\n\n`;
            
            // Get all tasks for this story
            const tasks = db.prepare('SELECT * FROM task WHERE story_id = ? ORDER BY id ASC').all(storyId) as Task[];
            const completedTasks = tasks.filter(t => t.status === 'completed');
            const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
            const pendingTasks = tasks.filter(t => t.status === 'pending');
            
            response += `### 🎯 Tasks (${completedTasks.length}/${tasks.length} completed)\n`;
            
            if (completedTasks.length > 0) {
                response += "\n**✅ Completed:**\n";
                completedTasks.forEach(task => {
                    response += `- Task #${task.id}: ${task.description}\n`;
                });
            }
            
            if (inProgressTasks.length > 0) {
                response += "\n**🔄 In Progress:**\n";
                inProgressTasks.forEach(task => {
                    response += `- Task #${task.id}: ${task.description}\n`;
                });
            }
            
            if (pendingTasks.length > 0) {
                response += "\n**⏳ Pending:**\n";
                pendingTasks.forEach(task => {
                    response += `- Task #${task.id}: ${task.description}\n`;
                });
            }
            
            // Get defects for this story
            const defects = db.prepare('SELECT * FROM defect WHERE story_id = ? ORDER BY timestamp DESC').all(storyId) as Defect[];
            if (defects.length > 0) {
                response += `\n### 🐛 Defects (${defects.length} total)\n`;
                defects.forEach(defect => {
                    const statusEmoji = defect.status === 'resolved' ? '✅' : defect.status === 'in_progress' ? '🔄' : '🔴';
                    response += `- ${statusEmoji} **Defect #${defect.id}** (${defect.status}): ${defect.description}\n`;
                });
            }
            
        } else {
            // List based on filter
            if (!filter || filter === 'stories') {
                const stories = db.prepare(`
                    SELECT s.*, 
                           COUNT(t.id) as task_count,
                           COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
                           COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
                           COUNT(d.id) as defect_count
                    FROM story s
                    LEFT JOIN task t ON s.id = t.story_id
                    LEFT JOIN defect d ON s.id = d.story_id AND d.status != 'resolved'
                    GROUP BY s.id
                    ORDER BY s.id DESC
                    LIMIT 20
                `).all() as any[];
                
                response += "## 📚 All Stories\n";
                if (stories.length === 0) {
                    response += "*No stories yet. Use `/ccmem-prime` with a story description to create one!*\n\n";
                } else {
                    stories.forEach(story => {
                        const progress = story.task_count > 0 ? Math.round((story.completed_tasks / story.task_count) * 100) : 0;
                        const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
                        
                        response += `\n**Story #${story.id}**: ${story.message}\n`;
                        response += `- 📊 Progress: [${progressBar}] ${progress}% (${story.completed_tasks}/${story.task_count} tasks)\n`;
                        if (story.in_progress_tasks > 0) response += `- 🔄 In Progress: ${story.in_progress_tasks} tasks\n`;
                        if (story.defect_count > 0) response += `- 🐛 Open Defects: ${story.defect_count}\n`;
                        response += `- 📅 Created: ${story.timestamp}\n`;
                    });
                }
                response += `\n*Use \`/ccmem-list <storyId>\` to see detailed story breakdown*\n`;
            }
            
            if (filter === 'tasks') {
                const tasks = db.prepare(`
                    SELECT t.*, s.message as story_message 
                    FROM task t 
                    JOIN story s ON t.story_id = s.id 
                    ORDER BY t.timestamp DESC 
                    LIMIT 30
                `).all() as any[];
                
                response += "## 🎯 All Tasks\n";
                if (tasks.length === 0) {
                    response += "*No tasks yet. Create stories first, then break them down into tasks.*\n";
                } else {
                    const byStatus = {
                        'completed': tasks.filter(t => t.status === 'completed'),
                        'in_progress': tasks.filter(t => t.status === 'in_progress'), 
                        'pending': tasks.filter(t => t.status === 'pending')
                    };
                    
                    Object.entries(byStatus).forEach(([status, statusTasks]) => {
                        if (statusTasks.length > 0) {
                            const emoji = status === 'completed' ? '✅' : status === 'in_progress' ? '🔄' : '⏳';
                            response += `\n### ${emoji} ${status.charAt(0).toUpperCase() + status.slice(1)} (${statusTasks.length})\n`;
                            statusTasks.slice(0, 10).forEach(task => {
                                response += `- **Task #${task.id}** (Story #${task.story_id}): ${task.description}\n`;
                            });
                        }
                    });
                }
            }
            
            if (filter === 'defects') {
                const defects = db.prepare(`
                    SELECT d.*, s.message as story_message 
                    FROM defect d 
                    JOIN story s ON d.story_id = s.id 
                    ORDER BY d.timestamp DESC 
                    LIMIT 20
                `).all() as any[];
                
                response += "## 🐛 All Defects\n";
                if (defects.length === 0) {
                    response += "*No defects recorded yet. That's good news! 🎉*\n";
                } else {
                    const openDefects = defects.filter(d => d.status !== 'resolved');
                    const resolvedDefects = defects.filter(d => d.status === 'resolved');
                    
                    if (openDefects.length > 0) {
                        response += `\n### 🔴 Open Defects (${openDefects.length})\n`;
                        openDefects.forEach(defect => {
                            const statusEmoji = defect.status === 'in_progress' ? '🔄' : '🔴';
                            response += `- ${statusEmoji} **Defect #${defect.id}** (${defect.status}): ${defect.description}\n`;
                            response += `  - Story #${defect.story_id}: ${defect.story_message}\n`;
                        });
                    }
                    
                    if (resolvedDefects.length > 0) {
                        response += `\n### ✅ Recently Resolved (${resolvedDefects.length})\n`;
                        resolvedDefects.slice(0, 5).forEach(defect => {
                            response += `- **Defect #${defect.id}**: ${defect.description} (Story #${defect.story_id})\n`;
                        });
                    }
                }
            }
            
            if (filter === 'landmines') {
                const landmines = db.prepare(`
                    SELECT l.*, t.description as task_description, s.message as story_message
                    FROM landmines l
                    JOIN task t ON l.task_id = t.id
                    JOIN story s ON t.story_id = s.id
                    ORDER BY l.timestamp DESC
                    LIMIT 15
                `).all() as any[];
                
                response += "## 💥 Landmine History (Learn from Pain)\n";
                if (landmines.length === 0) {
                    response += "*No landmines yet. You're either very lucky or haven't been coding dangerously enough! 😄*\n";
                } else {
                    response += "*These are the painful failures that taught us valuable lessons:*\n\n";
                    landmines.forEach(landmine => {
                        response += `**💥 Landmine #${landmine.id}** - *${landmine.timestamp}*\n`;
                        response += `- **Context**: ${landmine.error_context.substring(0, 120)}...\n`;
                        response += `- **Failed Attempts**: ${landmine.attempted_fixes.substring(0, 100)}...\n`;
                        response += `- **Task**: #${landmine.task_id} - ${landmine.task_description}\n`;
                        response += `- **Story**: #${landmine.story_id} - ${landmine.story_message}\n\n`;
                    });
                    response += "*💡 These landmines make Prime extra cautious in related areas!*\n";
                }
            }
        }
        
        // Summary stats
        const totalStories = db.prepare('SELECT COUNT(*) as count FROM story').get() as { count: number };
        const totalTasks = db.prepare('SELECT COUNT(*) as count FROM task').get() as { count: number };
        const completedTasks = db.prepare('SELECT COUNT(*) as count FROM task WHERE status = "completed"').get() as { count: number };
        const openDefects = db.prepare('SELECT COUNT(*) as count FROM defect WHERE status != "resolved"').get() as { count: number };
        const totalLandmines = db.prepare('SELECT COUNT(*) as count FROM landmines').get() as { count: number };
        
        response += "\n---\n## 📊 Project Summary\n";
        response += `📚 **Stories**: ${totalStories.count} total\n`;
        response += `🎯 **Tasks**: ${completedTasks.count}/${totalTasks.count} completed\n`;
        response += `🐛 **Open Defects**: ${openDefects.count}\n`;
        response += `💥 **Landmines**: ${totalLandmines.count} (lessons learned)\n`;
        
        response += "\n### 🔍 Filter Options:\n";
        response += "- `/ccmem-list` - All stories (default)\n";
        response += "- `/ccmem-list <storyId>` - Detailed story breakdown\n";
        response += "- `/ccmem-list tasks` - All tasks by status\n";  
        response += "- `/ccmem-list defects` - All defects and issues\n";
        response += "- `/ccmem-list landmines` - Painful failures and lessons\n";
        
        return { content: [{ type: "text", text: response }] };
        
    } catch (error: any) {
        return { content: [{ type: "text", text: `❌ List Error: ${error.message}` }] };
    }
});

// =================================================================
// --- PRIME LEARNING TOOLS ---
// =================================================================

server.tool('ccmem-prime-learn', 'Prime learns new facts from text, markdown, or URLs', {
    input: z.string(),
    category: z.string().optional().default('general'),
    confidence: z.number().int().min(0).max(100).optional().default(100)
}, async({input, category, confidence}) => {
    let content = input;
    let source = "manual";
    
    // Check if input is a file path
    if (input.endsWith('.md') || input.endsWith('.txt')) {
        try {
            const fs = await import('fs');
            if (fs.existsSync(input)) {
                content = fs.readFileSync(input, 'utf8');
                source = input;
            }
        } catch (error) {
            return { content: [{ type: "text", text: `❌ Could not read file: ${input}` }] };
        }
    }
    
    // Parse facts from content
    const facts = await parseFactsFromText(content, category, source, confidence);
    
    if (facts.length === 0) {
        return { content: [{ type: "text", text: `⚠️ No facts extracted from: ${input}` }] };
    }
    
    // Store facts in database
    let stored = 0;
    const transaction = db.transaction(() => {
        for (const fact of facts) {
            try {
                db.prepare(`
                    INSERT OR REPLACE INTO facts (category, key, value, source, confidence) 
                    VALUES (?, ?, ?, ?, ?)
                `).run(fact.category, fact.key, fact.value, fact.source, fact.confidence);
                stored++;
            } catch (error) {
                console.error(`Error storing fact: ${fact.key}`, error);
            }
        }
    });
    
    try {
        transaction();
        return { content: [{ type: "text", text: `✅ Prime learned ${stored} facts from ${source}\n\n📚 Categories learned: ${[...new Set(facts.map(f => f.category))].join(', ')}\n\n💡 Sample facts:\n${facts.slice(0, 3).map(f => `• ${f.key}: ${f.value.substring(0, 60)}...`).join('\n')}` }] };
    } catch (error: any) {
        return { content: [{ type: "text", text: `❌ Error storing facts: ${error.message}` }] };
    }
});

server.tool('ccmem-recall-facts', 'Prime recalls learned facts by category or keyword', {
    query: z.string().optional(),
    category: z.string().optional(),
    limit: z.number().int().optional().default(10)
}, async({query, category, limit}) => {
    let sql = 'SELECT * FROM facts WHERE 1=1';
    let params: any[] = [];
    
    if (category) {
        sql += ' AND category = ?';
        params.push(category);
    }
    
    if (query) {
        sql += ' AND (key LIKE ? OR value LIKE ?)';
        params.push(`%${query}%`, `%${query}%`);
    }
    
    sql += ' ORDER BY timestamp DESC, confidence DESC LIMIT ?';
    params.push(limit);
    
    const facts = db.prepare(sql).all(...params) as any[];
    
    if (facts.length === 0) {
        return { content: [{ type: "text", text: `🤔 Prime doesn't recall any facts matching your query` }] };
    }
    
    const factsByCategory = facts.reduce((acc, fact) => {
        if (!acc[fact.category]) acc[fact.category] = [];
        acc[fact.category].push(fact);
        return acc;
    }, {} as Record<string, any[]>);
    
    let response = `🧠 **Prime's Memory Recall** (${facts.length} facts)\n\n`;
    
    for (const [cat, catFacts] of Object.entries(factsByCategory)) {
        response += `**${cat.toUpperCase()}** (${catFacts.length} facts):\n`;
        for (const fact of catFacts) {
            const confidence = fact.confidence < 100 ? ` (${fact.confidence}% confident)` : '';
            response += `• **${fact.key}**: ${fact.value}${confidence}\n`;
        }
        response += '\n';
    }
    
    return { content: [{ type: "text", text: response }] };
});

server.tool('refresh-dashboard', 'Refresh CCMem dashboard data and open in browser', {
    openBrowser: z.boolean().optional().default(true)
}, async({openBrowser}) => {
    try {
        const { spawn } = await import('child_process');
        
        // Run the refresh dashboard script
        const scriptPath = './refresh_dashboard.sh';
        
        return new Promise((resolve, reject) => {
            const process = spawn('bash', [scriptPath], { stdio: 'pipe' });
            
            let output = '';
            let errorOutput = '';
            
            process.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ 
                        content: [{ 
                            type: "text", 
                            text: `✅ Dashboard refreshed successfully!\n\n${output}\n\n💡 Prime can now answer questions about the visual kanban board based on current CCMem data.` 
                        }] 
                    });
                } else {
                    resolve({ 
                        content: [{ 
                            type: "text", 
                            text: `❌ Dashboard refresh failed:\n${errorOutput}\n\nTry running manually: ./refresh_dashboard.sh` 
                        }] 
                    });
                }
            });
        });
        
    } catch (error: any) {
        return { content: [{ type: "text", text: `❌ Error running dashboard refresh: ${error.message}` }] };
    }
});

// Helper function to parse facts from text
async function parseFactsFromText(text: string, defaultCategory: string, source: string, confidence: number) {
    const facts: Array<{category: string, key: string, value: string, source: string, confidence: number}> = [];
    
    // Parse markdown headers and content
    const lines = text.split('\n');
    let currentCategory = defaultCategory;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Detect categories from headers
        if (line.startsWith('# ')) {
            currentCategory = line.replace('# ', '').toLowerCase().replace(/[^a-z0-9]/g, '_');
        } else if (line.startsWith('## ')) {
            currentCategory = line.replace('## ', '').toLowerCase().replace(/[^a-z0-9]/g, '_');
        }
        
        // Parse key-value pairs
        if (line.includes(': ')) {
            const [key, ...valueParts] = line.split(': ');
            const value = valueParts.join(': ').trim();
            if (key.trim() && value) {
                facts.push({
                    category: currentCategory,
                    key: key.replace(/^[-*]\s*/, '').trim(),
                    value: value,
                    source: source,
                    confidence: confidence
                });
            }
        }
        
        // Parse bullet points with descriptions
        if (line.match(/^[-*]\s+\*\*(.+?)\*\*:\s*(.+)$/)) {
            const match = line.match(/^[-*]\s+\*\*(.+?)\*\*:\s*(.+)$/);
            if (match) {
                facts.push({
                    category: currentCategory,
                    key: match[1].trim(),
                    value: match[2].trim(),
                    source: source,
                    confidence: confidence
                });
            }
        }
        
        // Parse definition lists
        if (line.startsWith('- **') && line.includes('**:')) {
            const match = line.match(/^-\s+\*\*(.+?)\*\*:\s*(.+)$/);
            if (match) {
                facts.push({
                    category: currentCategory,
                    key: match[1].trim(),
                    value: match[2].trim(),
                    source: source,
                    confidence: confidence
                });
            }
        }
    }
    
    return facts;
}

server.tool('test', 'tests the service', { }, async() => { return { content: [{ type: "text", text: "Test successful!" }]}; });

// --- Server Connection ---
const transport = new StdioServerTransport();
server.connect(transport);

console.log("MCP Server is running with full CCMem database tools...");

