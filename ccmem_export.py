#!/usr/bin/env python3
"""
CCMem Database Export Tool
Exports CCMem SQLite database to JSON for dashboard visualization
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path

def export_ccmem_to_json():
    """Export CCMem database to JSON for dashboard"""
    
    # Database connection
    db_path = Path("ccmem.db")
    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row  # Enable column access by name
    cursor = conn.cursor()
    
    # Export data
    data = {
        "lastUpdated": datetime.now().isoformat(),
        "stories": [],
        "tasks": [],
        "defects": [],
        "landmines": [],
        "metrics": {}
    }
    
    # Get stories
    cursor.execute("SELECT * FROM story ORDER BY timestamp DESC")
    stories = cursor.fetchall()
    for story in stories:
        data["stories"].append({
            "id": story["id"],
            "message": story["message"],
            "timestamp": story["timestamp"],
            "status": "active"  # We'll calculate this based on tasks
        })
    
    # Get tasks with story info
    cursor.execute("""
        SELECT t.*, s.message as story_message 
        FROM task t 
        LEFT JOIN story s ON t.story_id = s.id 
        ORDER BY t.timestamp DESC
    """)
    tasks = cursor.fetchall()
    for task in tasks:
        data["tasks"].append({
            "id": task["id"],
            "storyId": task["story_id"],
            "storyMessage": task["story_message"],
            "description": task["description"],
            "status": task["status"],  # pending, in_progress, completed
            "timestamp": task["timestamp"]
        })
    
    # Get defects
    cursor.execute("""
        SELECT d.*, s.message as story_message, t.description as task_description
        FROM defect d
        LEFT JOIN story s ON d.story_id = s.id
        LEFT JOIN task t ON d.task_id = t.id
        ORDER BY d.timestamp DESC
    """)
    defects = cursor.fetchall()
    for defect in defects:
        data["defects"].append({
            "id": defect["id"],
            "storyId": defect["story_id"],
            "taskId": defect["task_id"],
            "storyMessage": defect["story_message"],
            "taskDescription": defect["task_description"],
            "description": defect["description"],
            "status": defect["status"],  # open, in_progress, resolved
            "timestamp": defect["timestamp"]
        })
    
    # Get landmines
    cursor.execute("""
        SELECT l.*, t.description as task_description, s.message as story_message
        FROM landmines l
        LEFT JOIN task t ON l.task_id = t.id
        LEFT JOIN story s ON t.story_id = s.id
        ORDER BY l.timestamp DESC
    """)
    landmines = cursor.fetchall()
    for landmine in landmines:
        data["landmines"].append({
            "id": landmine["id"],
            "taskId": landmine["task_id"],
            "sessionId": landmine["session_id"],
            "taskDescription": landmine["task_description"],
            "storyMessage": landmine["story_message"],
            "errorContext": landmine["error_context"],
            "attemptedFixes": landmine["attempted_fixes"],
            "timestamp": landmine["timestamp"]
        })
    
    # Calculate metrics
    cursor.execute("SELECT COUNT(*) as count FROM story")
    story_count = cursor.fetchone()["count"]
    
    cursor.execute("SELECT COUNT(*) as count FROM task WHERE status = 'pending'")
    pending_tasks = cursor.fetchone()["count"]
    
    cursor.execute("SELECT COUNT(*) as count FROM task WHERE status = 'in_progress'")
    in_progress_tasks = cursor.fetchone()["count"]
    
    cursor.execute("SELECT COUNT(*) as count FROM task WHERE status = 'completed'")
    completed_tasks = cursor.fetchone()["count"]
    
    cursor.execute("SELECT COUNT(*) as count FROM defect WHERE status = 'open'")
    open_defects = cursor.fetchone()["count"]
    
    cursor.execute("SELECT COUNT(*) as count FROM landmines")
    landmine_count = cursor.fetchone()["count"]
    
    data["metrics"] = {
        "totalStories": story_count,
        "totalTasks": pending_tasks + in_progress_tasks + completed_tasks,
        "pendingTasks": pending_tasks,
        "inProgressTasks": in_progress_tasks,
        "completedTasks": completed_tasks,
        "openDefects": open_defects,
        "totalLandmines": landmine_count
    }
    
    # Calculate story progress
    for story in data["stories"]:
        story_tasks = [t for t in data["tasks"] if t["storyId"] == story["id"]]
        if story_tasks:
            completed = len([t for t in story_tasks if t["status"] == "completed"])
            total = len(story_tasks)
            story["progress"] = round((completed / total) * 100, 1) if total > 0 else 0
            story["taskCounts"] = {
                "total": total,
                "completed": completed,
                "inProgress": len([t for t in story_tasks if t["status"] == "in_progress"]),
                "pending": len([t for t in story_tasks if t["status"] == "pending"])
            }
            # Determine story status
            if completed == total and total > 0:
                story["status"] = "completed"
            elif any(t["status"] == "in_progress" for t in story_tasks):
                story["status"] = "in_progress"
            else:
                story["status"] = "pending"
        else:
            story["progress"] = 0
            story["taskCounts"] = {"total": 0, "completed": 0, "inProgress": 0, "pending": 0}
            story["status"] = "pending"
    
    conn.close()
    
    # Write JSON file
    output_path = Path("ccmem-data.json")
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    # Write JSONP file (no CORS issues!)
    jsonp_path = Path("ccmem-data.js")
    with open(jsonp_path, 'w') as f:
        f.write(f"window.ccmemData = {json.dumps(data, indent=2)};")
    
    print(f"✅ CCMem data exported to {output_path} and {jsonp_path}")
    print(f"📊 Summary: {story_count} stories, {pending_tasks + in_progress_tasks + completed_tasks} tasks, {open_defects} open defects, {landmine_count} landmines")
    
    return data

if __name__ == "__main__":
    export_ccmem_to_json()