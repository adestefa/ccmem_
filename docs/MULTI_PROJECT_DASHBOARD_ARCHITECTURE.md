# Multi-Project Dashboard Architecture

This document explains how the CCMem dashboard system supports multiple projects, each with their own database context and project-specific workflows.

## 🎯 **Architecture Overview**

The CCMem v3.2.0 dashboard system is designed to be **project-aware**, where each project maintains its own:
- SQLite database with project-specific stories and Prime analysis
- Dashboard server instance targeting the local database  
- Terminal integration pointing to the correct project directory
- Prime notifications and analysis history

## 🗂️ **Project Structure**

### **CCMem Project** (Primary/Central)
```
/Users/corelogic/satori-dev/ccmem/
├── ccmem.db                     # CCMem-specific database
├── dashboard-server.js          # Main dashboard server
├── ccmem-dashboard-integrated.html
├── ccmem-dashboard-v3.html
└── .mcp.json                    # MCP server configuration
```

**Dashboard Command:**
```bash
cd /Users/corelogic/satori-dev/ccmem
node dashboard-server.js
# http://localhost:3001 → CCMem project context
```

### **app-kozan Project** (Client Project)
```
/Users/corelogic/satori-dev/clients/app-kozan/
├── ccmem.db                           # app-kozan-specific database  
├── start_ccmem_dashboard_kozan.sh     # Project-specific launcher
├── upgrade_ccmem_db.py               # Database schema upgrader
└── .mcp.json                         # Points to centralized CCMem
```

**Dashboard Command:**
```bash
cd /Users/corelogic/satori-dev/clients/app-kozan
./start_ccmem_dashboard_kozan.sh
# http://localhost:3001 → app-kozan project context
```

## 📊 **Database Context Isolation**

### **CCMem Database (ccmem/ccmem.db)**
- **8 stories** focused on CCMem development
- **6 Prime notifications** from CCMem dashboard development
- **Key story**: "Read-Only DB Admin Dashboard" (in_development, 10/10 value)
- **Context**: Dashboard features, Prime integration, kanban workflow

### **app-kozan Database (app-kozan/ccmem.db)**  
- **3 stories** focused on fashion AI application
- **1 Prime notification** from authentication analysis
- **Key story**: "Authentication System Analysis" (HIGH priority, 8/10 value)
- **Context**: Fashion AI pipeline, VPS deployment, authentication systems

## 🔧 **Technical Implementation**

### **Project-Specific Dashboard Server**

The `start_ccmem_dashboard_kozan.sh` script creates a customized dashboard server:

```javascript
// Dynamic server configuration for app-kozan
const newDbPath = '/Users/corelogic/satori-dev/clients/app-kozan/ccmem.db';
const projectDir = '/Users/corelogic/satori-dev/clients/app-kozan';

// Replace database connection
serverCode.replace(/const db = new Database\('ccmem\.db'\)/, 
                  `const db = new Database('${newDbPath}')`);

// Replace terminal launch directory  
serverCode.replace(/const projectDir = process\.cwd\(\)/, 
                  `const projectDir = "${projectDir}"`);
```

### **MCP Server Integration**

Both projects share the same MCP servers but with project-specific targeting:

**app-kozan .mcp.json:**
```json
{
  "ccmem": {
    "command": "npx",
    "args": ["tsx", "/Users/corelogic/satori-dev/ccmem/main.ts"],
    "description": "CCMem v3.2.0 - Centralized service"
  },
  "serena": {
    "args": ["--project", "/Users/corelogic/satori-dev/clients/app-kozan"]
  }
}
```

**CCMem .mcp.json:**
```json
{
  "ccmem": {
    "command": "npx", 
    "args": ["tsx", "/Users/corelogic/satori-dev/ccmem/main.ts"],
    "description": "CCMem v3.2.0 - Local service"
  },
  "serena": {
    "args": ["--project", "/Users/corelogic/satori-dev/ccmem"]
  }
}
```

## 🎯 **Project Workflow Integration**

### **Start Development Button Behavior**

**In CCMem Project:**
- Launches terminal in `/Users/corelogic/satori-dev/ccmem`
- Prime has access to CCMem codebase and dashboard files
- Perfect for CCMem feature development

**In app-kozan Project:**
- Launches terminal in `/Users/corelogic/satori-dev/clients/app-kozan`  
- Prime has access to fashion AI codebase
- Perfect for app-kozan feature development

### **Prime Analysis Context**

**CCMem Prime Analysis:**
- Focuses on dashboard features, database schemas, MCP integration
- Risk assessment considers CCMem architecture complexity
- Recommendations align with CCMem development patterns

**app-kozan Prime Analysis:**  
- Focuses on fashion AI pipeline, authentication, VPS deployment
- Risk assessment considers production deployment impact
- Recommendations align with fashion business requirements

## 🔄 **Switching Between Projects**

### **Method 1: Manual Server Management**
```bash
# Stop current dashboard
pkill -f "dashboard-server"

# Start for CCMem
cd /Users/corelogic/satori-dev/ccmem
node dashboard-server.js

# OR start for app-kozan  
cd /Users/corelogic/satori-dev/clients/app-kozan
./start_ccmem_dashboard_kozan.sh
```

### **Method 2: Port-Based Separation (Future Enhancement)**
```bash
# CCMem on port 3001
cd /Users/corelogic/satori-dev/ccmem
PORT=3001 node dashboard-server.js

# app-kozan on port 3002  
cd /Users/corelogic/satori-dev/clients/app-kozan
PORT=3002 ./start_ccmem_dashboard_kozan.sh
```

## 🎨 **Dashboard Visual Differences**

### **CCMem Dashboard Features:**
- Stories focused on technical dashboard development
- Prime notifications about dashboard server, MCP setup, kanban fixes
- Terminal integration for CCMem codebase development
- Advanced Prime analysis with full report persistence

### **app-kozan Dashboard Features:**
- Stories focused on fashion AI business requirements  
- Prime notifications about authentication analysis, business logic
- Terminal integration for fashion app development
- Same advanced features but different business context

## 📈 **Benefits of Multi-Project Architecture**

### ✅ **Project Isolation**
- Each project maintains its own story backlog and progress
- Prime analysis history specific to project context
- No cross-contamination of development workflows

### ✅ **Shared Infrastructure**  
- Single CCMem codebase serves all projects
- Consistent dashboard UI/UX across projects
- Centralized MCP server maintenance

### ✅ **Context-Aware Development**
- Terminal integration targets correct project directory
- Prime analysis considers project-specific requirements
- Database schema upgrades can be project-specific

## 🚀 **Adding New Projects**

To add a new project to the CCMem dashboard system:

1. **Create project directory** with `ccmem.db`
2. **Upgrade database schema** using `upgrade_ccmem_db.py` 
3. **Create project launcher script** similar to `start_ccmem_dashboard_kozan.sh`
4. **Update .mcp.json** to point to centralized CCMem
5. **Add project-specific stories** and Prime context

## 🎯 **Current Status**

**✅ CCMem Project**: 8 stories, 6 Prime notifications, dashboard development focus  
**✅ app-kozan Project**: 3 stories, 1 Prime notification, fashion AI business focus  
**✅ Both projects**: Full dashboard functionality, Prime integration, terminal workflows

The multi-project architecture is fully operational and ready for additional projects! 🎊