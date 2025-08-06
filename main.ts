#!/usr/bin/env tsx

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


server.tool('test', 'tests the service', { }, async() => { return { content: [{ type: "text", text: "Test successful!" }]}; });

// --- Server Connection ---
const transport = new StdioServerTransport();
server.connect(transport);

console.log("MCP Server is running with full CCMem database tools...");

