# CCMem Portal-Based Architecture v3.2.0

## 🎯 **Vision & Architecture Overview**

The CCMem Portal-Based Architecture represents a revolutionary approach to multi-project development workflows. Instead of maintaining separate CCMem installations or complex server configurations, each project now gets its own **standardized portal** that provides:

- **🌐 Unique URL paths**: `http://localhost:3005/ccmem` vs `http://localhost:3006/kozan`
- **📦 Isolated contexts**: Each project maintains its own database, stories, and Prime analysis
- **🔧 Standardized operations**: Universal `start.sh`/`stop.sh` scripts across all projects
- **⚡ Easy deployment**: One-command portal installation to any project directory

## 🏗️ **Architecture Benefits**

### ✅ **Extensibility**
- **New projects**: Add CCMem dashboard to any project in under 60 seconds
- **Standardized interface**: Same workflow across all projects regardless of technology stack
- **Zero configuration drift**: All portals use identical template with project-specific config

### ✅ **Simplicity** 
- **Single source of truth**: One CCMem installation serves unlimited projects
- **No code duplication**: All portals share the same dashboard HTML/CSS/JS
- **Unified dependency management**: All portals use CCMem's node_modules

### ✅ **Isolation**
- **Database separation**: Each project maintains its own SQLite database and context
- **URL namespacing**: Path-based routing prevents conflicts (`/ccmem` vs `/kozan`)
- **Process isolation**: Each portal runs in its own Node.js process with unique PIDs

## 📋 **Portal Structure**

Every project gets a standardized `/ccmem/portal/` directory:

```
project-name/
├── ccmem/
│   └── portal/
│       ├── config.json         # Project-specific configuration
│       ├── server.js           # Express server with API endpoints
│       ├── dashboard.html      # Kanban dashboard UI
│       ├── start.sh           # Standardized start script
│       └── stop.sh            # Standardized stop script
└── ccmem.db                   # Project-specific SQLite database
```

## ⚙️ **Configuration System**

Each portal is driven by `config.json`:

```json
{
  "project": {
    "name": "kozan",
    "displayName": "Isle by Melis Kozan Fashion AI", 
    "path": "/Users/corelogic/satori-dev/clients/app-kozan",
    "database": "./ccmem.db"
  },
  "server": {
    "port": 3006,
    "basePath": "/kozan",
    "title": "Isle by Melis Kozan Fashion AI - CCMem Dashboard"
  },
  "ccmem": {
    "mainPath": "/Users/corelogic/satori-dev/ccmem",
    "version": "3.2.0"
  },
  "features": {
    "terminalIntegration": true,
    "primeAnalysis": true,
    "kanbanWorkflow": true
  }
}
```

## 🚀 **Installation & Usage**

### **Installing a Portal**

```bash
# From CCMem directory
./install-portal.sh /path/to/project --name project-name --display "Project Display Name" --port 3006

# Example: Install portal for app-kozan
./install-portal.sh /Users/corelogic/satori-dev/clients/app-kozan --name kozan --display "Isle by Melis Kozan Fashion AI" --port 3006
```

### **Portal Operations**

```bash
# Start portal
cd project-name/ccmem/portal
./start.sh

# Stop portal  
./stop.sh

# Check status
curl http://localhost:3006/kozan/api/health
```

## 🌐 **URL Structure & API**

Each portal provides a complete API at its base path:

### **CCMem Project Portal (Port 3005)**
- **Dashboard**: `http://localhost:3005/ccmem`
- **Health Check**: `http://localhost:3005/ccmem/api/health`
- **Backlog API**: `http://localhost:3005/ccmem/api/backlog`
- **Terminal Launch**: `http://localhost:3005/ccmem/api/dev/launch-terminal/{id}`

### **app-kozan Project Portal (Port 3006)**
- **Dashboard**: `http://localhost:3006/kozan` 
- **Health Check**: `http://localhost:3006/kozan/api/health`
- **Backlog API**: `http://localhost:3006/kozan/api/backlog`
- **Terminal Launch**: `http://localhost:3006/kozan/api/dev/launch-terminal/{id}`

## 🔧 **Technical Implementation**

### **Dependency Resolution**
Portals use a clever dependency resolution system to avoid requiring separate `node_modules`:

```javascript
// Import dependencies directly from CCMem installation
const ccmemNodeModules = path.resolve(config.ccmem.mainPath, 'node_modules');
const express = require(path.join(ccmemNodeModules, 'express'));
const Database = require(path.join(ccmemNodeModules, 'better-sqlite3'));
```

### **Database Context Isolation**
Each portal connects to its project-specific database:

```javascript
// Database connection uses project-specific path
const dbPath = path.resolve(config.project.path, config.project.database);
const db = new Database(dbPath);  // /Users/corelogic/.../app-kozan/ccmem.db
```

### **Terminal Integration**
Terminal launches target the correct project directory:

```javascript
// Launch Alacritty terminal in project directory
const terminal = spawn('alacritty', ['--working-directory', config.project.path], {
    detached: true, stdio: 'ignore'
});
```

## 📊 **Current Deployment Status**

### ✅ **CCMem Project Portal** 
- **Location**: `/Users/corelogic/satori-dev/ccmem/ccmem/portal`
- **URL**: `http://localhost:3005/ccmem`
- **Database**: 8 CCMem development stories, 6 Prime notifications
- **Focus**: Dashboard features, MCP integration, kanban workflow development

### ✅ **app-kozan Project Portal**
- **Location**: `/Users/corelogic/satori-dev/clients/app-kozan/ccmem/portal`  
- **URL**: `http://localhost:3006/kozan`
- **Database**: 3 fashion AI stories, 1 Prime notification
- **Focus**: Fashion AI pipeline, authentication systems, business workflows

## 🎯 **Workflow Integration**

### **Development Workflow**
1. **Navigate to project**: `cd /path/to/project`
2. **Start portal**: `ccmem/portal/start.sh`
3. **Open dashboard**: `http://localhost:PORT/PROJECT_NAME`
4. **Start Development**: Click button to launch Alacritty terminal in project directory
5. **Prime Analysis**: Full context-aware analysis saved to project database

### **Multi-Project Management**
- **Run simultaneously**: Each portal uses unique port and path
- **Context switching**: Simply change browser tabs between project dashboards
- **Independent operations**: Start/stop portals independently without affecting others

## 🔮 **Future Enhancements**

### **Planned Features**
- **Portal discovery service**: Auto-detect running portals with unified interface
- **Project templates**: Pre-configured portals for different project types
- **Custom themes**: Project-specific branding and UI customization
- **Plugin system**: Extensible portal functionality for different frameworks

### **Scaling Considerations**
- **Docker integration**: Containerized portals for complex deployment scenarios
- **Remote database support**: PostgreSQL/MySQL support for team environments  
- **Authentication**: Project-specific access control and user management

## 📈 **Migration Path**

### **From Legacy Dashboard System**
The portal architecture completely replaces the previous multi-server approach:

**Before (Legacy)**:
```bash
# Multiple servers, port conflicts, manual configuration
node dashboard-server.js                    # Port 3001, CCMem context
node dashboard-server-kozan.js             # Port 3001, app-kozan context (conflicts!)
```

**After (Portal-Based)**:
```bash  
# Clean separation, no conflicts, standardized operations
ccmem/portal/start.sh                      # Port 3005, /ccmem path
app-kozan/ccmem/portal/start.sh            # Port 3006, /kozan path
```

### **Benefits of Migration**
- **✅ No more port conflicts**: Each project gets unique port
- **✅ No more manual server configuration**: Template-based deployment
- **✅ No more database path issues**: Config-driven database targeting
- **✅ Standardized operations**: Same start/stop workflow across all projects

## 🎊 **Conclusion**

The CCMem Portal-Based Architecture represents a mature, production-ready solution for multi-project development workflows. It combines the simplicity of standardized operations with the flexibility of project-specific contexts, enabling seamless scaling from single projects to complex multi-project environments.

**Key Achievements:**
- **🚀 60-second deployment**: Add CCMem dashboard to any project instantly
- **🌐 Clean URL structure**: No more port conflicts or path issues  
- **📦 Zero duplication**: Single CCMem installation serves unlimited projects
- **🔧 Battle-tested**: Successfully deployed across CCMem and app-kozan projects

The architecture is ready for immediate adoption and provides a solid foundation for future enhancements and scaling requirements.