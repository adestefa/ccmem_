# CCMem Project Architecture Documentation

## Project Overview

CCMem (Claude Code Memory) is a comprehensive project memory and learning system designed to enhance Claude Code's capabilities by providing persistent storage, learning mechanisms, and visual dashboards for tracking development progress.

## Core Components

### 1. MCP Server (`main.ts`)
**Location**: `/Users/corelogic/satori-dev/ccmem/main.ts`
**Technology**: TypeScript with better-sqlite3
**Purpose**: Model Context Protocol server providing CCMem tools to Claude Code

#### Key Features:
- **Database Operations**: Core CRUD operations for stories, tasks, defects, and landmines
- **Prime Learning System**: Advanced AI learning capabilities with facts storage
- **Dashboard Integration**: Data export and refresh tools
- **Project Memory**: Persistent storage across coding sessions

#### Database Schema:
- `story` - User stories and requirements
- `task` - Development tasks linked to stories
- `defect` - Bug tracking and resolution
- `landmines` - Error context and trauma awareness
- `facts` - Prime's learned knowledge base

### 2. Visual Dashboard System

#### Dashboard HTML (`ccmem-dashboard.html`)
**Technology**: Tailwind CSS, JavaScript
**Purpose**: Visual kanban board for project tracking
**Features**:
- Four-column layout: Queue → Development → QA → Done
- Real-time progress tracking
- Dark theme with color-coded status indicators
- JSONP data loading (no CORS issues)

#### Data Export (`ccmem_export.py`)
**Purpose**: Exports SQLite data to JSON/JSONP formats
**Output Files**:
- `ccmem-data.json` - Standard JSON format
- `ccmem-data.js` - JSONP format for browser loading

#### Dashboard Refresh (`refresh_dashboard.sh`)
**Purpose**: Automated dashboard update and browser management
**Capabilities**:
- Exports latest database data
- Opens/refreshes Brave Browser tabs
- AppleScript automation for tab management

### 3. Prime Learning System

#### Facts Database
**Table**: `facts`
**Purpose**: Store Prime's learned knowledge
**Schema**:
- `category` - Knowledge domain (project, technical, workflow)
- `key` - Specific knowledge identifier
- `value` - The learned information
- `source` - Where the knowledge came from
- `confidence` - Reliability score (0-100)
- `timestamp` - When knowledge was acquired

#### Learning Tools:
- `ccmem-prime-learn` - Process documentation and extract facts
- `ccmem-recall-facts` - Query learned knowledge
- `refresh-dashboard` - Update visual dashboard

### 4. Slash Commands

**Location**: `.claude/commands/`
**Available Commands**:
- `/ccmem-init` - Initialize project memory
- `/ccmem-prime` - Interact with Prime agent
- `/ccmem-prime-learn` - Teach Prime new facts
- `/ccmem-recall-facts` - Query Prime's knowledge
- `/ccmem-list` - List project items
- `/ccmem-qa` - Quality assurance workflows
- `/ccmem-doc` - Documentation tools
- `/ccmem-dev` - Development utilities
- `/ccmem-boot` - System startup

## Architecture Patterns

### 1. Project-Specific Databases
Each project directory maintains its own `ccmem.db` file, ensuring:
- Isolated project memory
- No cross-project contamination
- Scalable multi-project support

### 2. MCP Integration
CCMem integrates with Claude Code via Model Context Protocol:
- JSON-RPC communication
- Tool-based interactions
- Seamless Claude Code integration

### 3. JSONP Data Pattern
Dashboard uses JSONP to avoid browser CORS restrictions:
- Static file serving
- No HTTP server required
- Direct file:// protocol access

### 4. Trauma-Aware Development
Landmine system provides error context awareness:
- Records failures and attempted solutions
- Prevents repeating known problematic approaches
- Builds institutional knowledge of what doesn't work

## Development Workflow

### 1. Session Initialization
1. CCMem server starts via `.mcp.json` configuration
2. Database tables are verified/created
3. Slash commands become available
4. Prime learning system activates

### 2. Development Cycle
1. Create stories with `/ccmem-prime`
2. Break down into tasks
3. Track progress in visual dashboard
4. Record defects and solutions
5. Build knowledge base via Prime learning

### 3. Knowledge Management
1. Prime learns from documentation
2. Facts stored in categorized structure
3. Knowledge retrieved for future sessions
4. Continuous improvement of project understanding

## File Structure

```
/Users/corelogic/satori-dev/ccmem/
├── main.ts                    # MCP server
├── package.json              # Dependencies
├── ccmem.db                  # SQLite database
├── ccmem-dashboard.html      # Visual dashboard
├── ccmem_export.py          # Data export tool
├── refresh_dashboard.sh     # Dashboard automation
├── ccmem-data.json          # Exported data (JSON)
├── ccmem-data.js            # Exported data (JSONP)
├── .mcp.json                # MCP server config
└── .claude/
    └── commands/            # Slash commands
        ├── ccmem-init.md
        ├── ccmem-prime.md
        └── ...
```

## Dependencies

### TypeScript/Node.js
- `better-sqlite3` - SQLite database operations
- `@anthropic/sdk` - MCP server framework

### Python
- `sqlite3` - Database export operations
- `json` - Data serialization

### Browser
- Tailwind CSS (CDN)
- Vanilla JavaScript
- JSONP data loading

## Configuration

### MCP Server (`.mcp.json`)
```json
{
  "mcpServers": {
    "ccmem": {
      "command": "tsx",
      "args": ["/Users/corelogic/satori-dev/ccmem/main.ts"],
      "description": "CCMem - Claude Code Memory Server with Prime Learning System"
    }
  }
}
```

### Database Location
- **Development**: `ccmem.db` in project root
- **Export Path**: Same directory as export script
- **Dashboard Path**: File URLs with absolute paths

## Security & Best Practices

### Data Integrity
- SQLite ACID compliance
- Prepared statements for SQL injection prevention
- Automatic timestamp generation

### Error Handling
- Graceful MCP tool failures
- Database connection verification
- Export process error checking

### Performance
- Efficient SQLite queries
- Minimal data transfer
- Browser-friendly static file serving

## Future Enhancements

### Planned Features
- Multi-user project collaboration
- Enhanced Prime learning algorithms
- Advanced dashboard visualizations
- Integration with external tools (GitHub, Jira, etc.)

### Scalability Considerations
- Database sharding for large projects
- Distributed MCP server architecture
- Cloud-based dashboard hosting options