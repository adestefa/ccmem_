# CCMem - Claude Code Memory Server

A sophisticated Model Context Protocol (MCP) server that provides persistent development context and project memory management for Claude Code sessions.

## Overview

CCMem is a TypeScript-based MCP server that uses SQLite to maintain comprehensive development context across Claude Code sessions. It provides tools for tracking stories, tasks, defects, project architecture, and development patterns to improve code consistency and avoid repeating mistakes.

## Features

### 📋 Project Management
- **Stories & Tasks**: Track development stories and break them down into manageable tasks
- **Defect Management**: Log and track defects with full history
- **Session History**: Maintain complete session tracking with start/end times and summaries

### 🏗️ System Knowledge
- **Architecture Documentation**: Store and retrieve architectural decisions and patterns
- **Operations Info**: Track deployment, testing, and operational procedures
- **Project Context**: Maintain general project information and conventions

### ⚠️ Risk Management
- **Landmine Detection**: Flag problematic patterns and failed approaches
- **Risk Keywords**: Build searchable knowledge base of risky patterns
- **Gold Standards**: Mark successful implementations as reference patterns

### 📊 Analytics
- **Project Metrics**: Track story, task, defect, and session counts
- **Full Project Summary**: Comprehensive overview of all project aspects

## Installation

### Via NPX (Recommended)
```bash
npx github:adestefa/ccmem_
```

### Local Development
```bash
git clone https://github.com/adestefa/ccmem_.git
cd ccmem_
npm install
npm start
```

## MCP Tools Available

### High-Level Context
- `get-full-project-summary` - Comprehensive project overview with metrics

### System Memory
- `set-project-info` - Store general project details
- `set-architecture-info` - Record architectural decisions
- `set-operation-info` - Track operational procedures
- `set-deployment-info` - Store deployment information
- `set-testing-info` - Document testing approaches

### Story & Task Management
- `write-story` - Create new development stories
- `create-task` - Break stories into actionable tasks
- `list-tasks-for-story` - View all tasks for a story
- `get-task-details` - Full task history and details

### Defect Management
- `create-defect` - Log new defects
- `list-defects-for-story` - View defects by story
- `get-defect-details` - Complete defect history

### Workflow Actions
- `start-work-on-task` - Begin work session on a task
- `record-task-result` - Log task completion with files changed
- `record-defect-result` - Record defect resolution
- `flag-landmine` - Mark problematic patterns with context
- `set-gold-standard` - Flag successful implementations
- `find-relevant-risks` - Search for similar past issues
- `get-landmine-details` - Retrieve specific landmine reports

### Utility
- `test` - Verify server connection

## Database Schema

CCMem uses SQLite with the following key tables:

- **story** - Development stories and requirements
- **task** - Individual tasks within stories
- **defect** - Issues and bugs with tracking
- **task_log** - Detailed task execution history
- **defect_log** - Defect resolution history
- **history** - Session tracking
- **landmines** - Failed approaches and problematic patterns
- **risks** - Categorized risk patterns
- **general/architecture/operations/deployment/testing** - System knowledge

## Usage with MCP Inspector

Test the server using the MCP Inspector:

```bash
# Start MCP Inspector
npx -y @modelcontextprotocol/inspector

# Configure server endpoint: stdio main.ts
# Test available tools and functionality
```

## Example Workflow

```typescript
// 1. Start a new story
write-story: "Implement user authentication system"

// 2. Break down into tasks
create-task: { storyId: 1, description: "Design user schema" }
create-task: { storyId: 1, description: "Implement JWT authentication" }
create-task: { storyId: 1, description: "Add login/logout endpoints" }

// 3. Work on tasks with session tracking
start-work-on-task: { taskId: 1, sessionId: "auth-session-1" }
record-task-result: { 
  taskId: 1, 
  sessionId: "auth-session-1",
  summary: "Completed user schema with email and password fields",
  filesEdited: ["models/User.ts", "migrations/001_create_users.sql"]
}

// 4. Flag issues for future reference
flag-landmine: {
  taskId: 2,
  sessionId: "auth-session-2",
  errorContext: "JWT secret configuration caused deployment failure",
  attemptedFixes: "Tried environment variables, Docker secrets",
  riskKeywords: ["jwt", "secrets", "deployment", "environment"]
}

// 5. Mark successful patterns
set-gold-standard: {
  taskId: 3,
  commitHash: "abc123",
  summary: "Clean JWT implementation with proper error handling",
  filesEdited: ["auth/jwt.ts", "middleware/auth.ts"]
}
```

## Development

### Prerequisites
- Node.js 16+
- TypeScript
- Better SQLite3

### Scripts
- `npm start` - Start the MCP server
- `./scripts/inspector.sh` - Launch MCP Inspector
- `./scripts/install.sh` - Install dependencies
- `./scripts/kill-port.sh [port]` - Kill processes on specified port

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with MCP Inspector
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please use the GitHub Issues page.