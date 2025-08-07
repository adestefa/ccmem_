# CCMem Prime Learn

Teach Prime new facts from text, markdown files, or documentation

## Description

This powerful command allows Prime to learn and remember new facts, documentation, and knowledge that will enhance his ability to assist with your project. Prime can learn from direct text input, markdown files, or URLs, and intelligently categorize and store the information for future reference.

## Usage

```
/ccmem-prime-learn <input> [category] [confidence]
```

## Parameters

- `input` (required): Text content, file path (*.md, *.txt), or documentation to learn from
- `category` (optional): Category to organize the facts (default: "general")  
- `confidence` (optional): Confidence level 0-100% (default: 100%)

## What Prime Learns

Prime intelligently extracts and categorizes facts from:

### Markdown Structure
- **Headers**: Auto-detect categories from `# Header` and `## Subheader`
- **Key-Value Pairs**: Lines with `Key: Value` format
- **Bullet Points**: `- **Term**: Description` patterns
- **Definition Lists**: Structured documentation patterns

### Content Types
- **Project Documentation**: Architecture, workflows, commands
- **API References**: Endpoints, parameters, responses  
- **Troubleshooting Guides**: Common issues and solutions
- **Best Practices**: Proven patterns and approaches
- **Tool Usage**: Command syntax and examples

## Examples

### Learn from Direct Text
```bash
/ccmem-prime-learn "Dashboard Refresh: Use ./refresh_dashboard.sh to update kanban board data and open in browser"
```

### Learn from Markdown File
```bash
/ccmem-prime-learn kanban-dashboard.md
```

### Learn with Custom Category
```bash  
/ccmem-prime-learn api-documentation.md api 95
```

### Learn Multiple Facts
```bash
/ccmem-prime-learn "
## Dashboard Operations
- **Refresh Command**: ./refresh_dashboard.sh
- **Data Export**: python3 ccmem_export.py  
- **Browser Path**: file:///Users/.../ccmem-dashboard.html

## Kanban Columns
- **Queue**: Pending tasks waiting to start
- **Development**: Tasks currently being worked on
- **QA**: Tasks ready for quality assurance
- **Done**: Completed tasks
"
```

## Prime's Intelligence

After learning, Prime will:

### 🧠 **Remember Facts**
- Store all learned information in organized categories
- Reference facts when answering questions
- Build connections between related concepts

### 📚 **Categorize Knowledge**  
- Auto-detect categories from content structure
- Organize facts for efficient retrieval
- Cross-reference related information

### 💡 **Apply Learning**
- Use learned facts in recommendations
- Reference documentation when troubleshooting
- Provide context-aware guidance

### 🔍 **Recall on Demand**
- Answer questions using learned knowledge
- Provide specific examples and commands
- Reference source documentation

## Companion Commands

### View Learned Facts
```bash
/ccmem-recall-facts dashboard
/ccmem-recall-facts "kanban board"
```

### Categories Prime Learns
- **`dashboard`**: Visual kanban board operations
- **`api`**: REST endpoints and integration  
- **`troubleshooting`**: Common issues and fixes
- **`workflows`**: Development processes
- **`commands`**: Shell scripts and tool usage

## Integration with Prime Agent

Once Prime learns new facts, they become part of his **battle-tested knowledge base**:

```bash
# Prime now knows about dashboard operations
/ccmem-prime "Show me the current kanban status"

# Prime can refresh and analyze the board  
/ccmem-prime "Refresh the dashboard and tell me what needs attention"

# Prime references learned facts in guidance
/ccmem-prime "What's the proper way to update dashboard data?"
```

## Example Learning Session

```bash
# 1. Teach Prime about the dashboard
/ccmem-prime-learn kanban-dashboard.md

# 2. Prime learns the facts and responds
✅ Prime learned 15 facts from kanban-dashboard.md

📚 Categories learned: dashboard, kanban, commands

💡 Sample facts:
• Refresh Command: ./refresh_dashboard.sh to update data and open browser
• Queue Column: Contains pending tasks waiting to start development
• Data Export: python3 ccmem_export.py generates JSONP data file...

# 3. Prime can now answer dashboard questions
/ccmem-prime "What's in the Done column?"

# Prime responds with learned knowledge:
🧠 Based on my learned knowledge about the kanban dashboard, the Done column contains completed tasks that have been finished successfully...
```

## Benefits

### For Prime
- **Enhanced Context**: Deeper understanding of your tools and workflows
- **Smarter Recommendations**: Fact-based suggestions and guidance
- **Consistent Knowledge**: Reliable information across all interactions

### For You  
- **Teaching Interface**: Easy way to educate your AI partner
- **Knowledge Persistence**: Facts survive across all sessions
- **Custom Documentation**: Prime learns your specific setup and preferences

**Transform Prime into a true expert on your project by teaching him everything he needs to know!** 🚀