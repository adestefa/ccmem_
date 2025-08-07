# Database Enhancement Plan for Real-Time Dashboard

## New Tables

### 1. Backlog Table
```sql
CREATE TABLE IF NOT EXISTS backlog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    success_criteria TEXT NOT NULL,
    priority INTEGER DEFAULT 3, -- 1=Critical, 2=High, 3=Medium, 4=Low, 5=Nice-to-have
    estimated_complexity TEXT DEFAULT 'moderate', -- simple, moderate, complex, high_risk
    business_value INTEGER DEFAULT 5, -- 1-10 scale
    risk_score INTEGER DEFAULT 0, -- Calculated by Prime
    created_by TEXT DEFAULT 'user',
    assigned_to_agent TEXT NULL, -- Which agent is analyzing/working on it
    status TEXT DEFAULT 'backlog', -- backlog, analyzing, ready, blocked
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_analyzed DATETIME NULL,
    prime_notes TEXT NULL
);
```

### 2. Agent Sessions Table
```sql
CREATE TABLE IF NOT EXISTS agent_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    parent_story_id INTEGER,
    backlog_id INTEGER NULL,
    task_id INTEGER NULL,
    agent_type TEXT NOT NULL, -- prime, architecture, implementation, testing, security, integration, qa
    status TEXT DEFAULT 'active', -- active, paused, completed, failed, halted
    current_action TEXT NULL,
    file_locks TEXT NULL, -- JSON array of locked files to prevent conflicts
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME NULL,
    risk_level INTEGER DEFAULT 0,
    oversight_level TEXT DEFAULT 'standard', -- standard, enhanced, strict, direct
    FOREIGN KEY (parent_story_id) REFERENCES story(id) ON DELETE CASCADE,
    FOREIGN KEY (backlog_id) REFERENCES backlog(id) ON DELETE SET NULL,
    FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE SET NULL
);
```

### 3. QA Results Table
```sql
CREATE TABLE IF NOT EXISTS qa_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    agent_session_id TEXT NOT NULL,
    qa_type TEXT NOT NULL, -- code_review, functional_test, mock_detection, success_criteria
    status TEXT NOT NULL, -- pass, fail, warning
    findings TEXT NULL, -- JSON array of specific findings
    mock_violations TEXT NULL, -- Detected mocks/shortcuts
    success_criteria_met BOOLEAN DEFAULT FALSE,
    remediation_needed TEXT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_session_id) REFERENCES agent_sessions(session_id) ON DELETE CASCADE
);
```

### 4. File Locks Table
```sql
CREATE TABLE IF NOT EXISTS file_locks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    locked_by_session TEXT NOT NULL,
    lock_type TEXT DEFAULT 'exclusive', -- exclusive, shared
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    FOREIGN KEY (locked_by_session) REFERENCES agent_sessions(session_id) ON DELETE CASCADE
);
```

## Enhanced Existing Tables

### Task Table Additions
```sql
-- Add QA status tracking
ALTER TABLE task ADD COLUMN qa_status TEXT DEFAULT 'not_started'; -- not_started, in_qa, qa_passed, qa_failed
ALTER TABLE task ADD COLUMN success_criteria_met BOOLEAN DEFAULT FALSE;
ALTER TABLE task ADD COLUMN assigned_agent_session TEXT NULL;
```

### Story Table Additions  
```sql
-- Add backlog origin tracking
ALTER TABLE story ADD COLUMN created_from_backlog_id INTEGER NULL;
ALTER TABLE story ADD COLUMN prime_approved BOOLEAN DEFAULT FALSE;
```