# CCMem Init

Initialize CCMem project memory from existing codebase

## Description

This command performs comprehensive project initialization by:
- Auto-detecting project structure and architecture
- Populating CCMem database with discovered information
- Setting up initial project configuration
- Creating foundation for project memory system

## Usage

```
/ccmem-init
```

## What it does

1. **Project Discovery**:
   - Scans current directory structure
   - Identifies framework/language (FastAPI, React, etc.)
   - Detects configuration files and dependencies
   - Maps key directories and file patterns

2. **Architecture Documentation**:
   - Extracts framework information from package files
   - Documents database connections and configurations  
   - Records deployment and operational details
   - Identifies testing strategies and tools

3. **CCMem Database Setup**:
   - Populates `general` table with project metadata
   - Fills `architecture` table with technical details
   - Records `operations` information (start/stop commands)
   - Initializes `deployment` and `testing` configurations

4. **Initial Context Creation**:
   - Creates project summary for future sessions
   - Establishes baseline for progress tracking
   - Sets up risk awareness foundation

## Implementation

This command calls the CCMem MCP tool `ccmem-init` which performs the actual initialization logic.

## Example Output

```
✅ Project initialized in CCMem database
📁 Detected: FastAPI + SQLite application  
🏗️ Architecture: FastAPI backend with Jinja2 templates
🚀 Operations: ./start.sh (development), ./stop.sh 
🧪 Testing: pytest configuration found
📊 Ready for CCMem-powered development sessions
```

Use `get-full-project-summary` after initialization to see the complete project context.