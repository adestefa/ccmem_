# CCMem Recall Facts

Prime recalls learned facts by category or keyword search

## Description

This command allows Prime to search and recall facts from his learned knowledge base. Prime can filter by category, search by keywords, or browse all learned facts to provide you with relevant information.

## Usage

```
/ccmem-recall-facts [query] [category] [limit]
```

## Parameters

- `query` (optional): Search term to find in fact keys or values
- `category` (optional): Filter by specific category (e.g., "dashboard", "api")
- `limit` (optional): Maximum number of facts to return (default: 10)

## Search Examples

### Browse All Recent Facts
```bash
/ccmem-recall-facts
```

### Search by Keyword  
```bash
/ccmem-recall-facts "kanban"
/ccmem-recall-facts "refresh"
/ccmem-recall-facts "browser"
```

### Filter by Category
```bash
/ccmem-recall-facts "" dashboard
/ccmem-recall-facts "" api  
/ccmem-recall-facts "" troubleshooting
```

### Combined Search
```bash
/ccmem-recall-facts "refresh" dashboard 5
```

## Output Format

Prime organizes recalled facts by category with confidence levels:

```
🧠 **Prime's Memory Recall** (8 facts)

**DASHBOARD** (5 facts):
• **Refresh Command**: ./refresh_dashboard.sh to update data and open browser
• **Data Export**: python3 ccmem_export.py generates JSONP data file  
• **Browser Path**: file:///Users/corelogic/satori-dev/clients/app-kozan/ccmem-dashboard.html
• **Columns**: Queue → Development → QA → Done workflow
• **Visual Features**: Progress bars, metrics cards, project details

**KANBAN** (3 facts):
• **Queue Column**: Contains pending tasks waiting to start development
• **Development Column**: Tasks currently being worked on by developers
• **Done Column**: Completed tasks that have been finished successfully (90% confident)
```

## Integration with Prime

Recalled facts enhance Prime's responses:

```bash
# Check what Prime knows about dashboards
/ccmem-recall-facts dashboard

# Prime can then use this knowledge  
/ccmem-prime "Based on what you know about our dashboard, what should I do to see current progress?"

# Prime references learned facts:
🧠 Based on my learned knowledge about the dashboard, you should run ./refresh_dashboard.sh 
to update the kanban board data and open it in your browser. This will show you the current 
progress with visual progress bars and task distribution across Queue → Development → QA → Done columns.
```

## Fact Categories

Prime organizes knowledge into these categories:

### **`dashboard`**
- Visual kanban board operations  
- Refresh commands and scripts
- Browser paths and URLs
- UI components and features

### **`kanban`**  
- Column definitions and workflows
- Task status meanings
- Progress tracking methods
- Board interactions

### **`commands`**
- Shell scripts and executables
- Command-line tools and options
- File paths and locations
- Operational procedures

### **`api`** 
- REST endpoints and methods
- Request/response formats
- Integration patterns
- Authentication details

### **`troubleshooting`**
- Common issues and solutions
- Error messages and fixes  
- Debugging techniques
- Recovery procedures

## Confidence Levels

Prime tracks confidence in learned facts:

- **100%**: Definitive facts from reliable sources
- **90-99%**: High confidence with minor uncertainty
- **80-89%**: Generally reliable but may need verification  
- **<80%**: Lower confidence, should be validated

## Use Cases

### **Project Onboarding**
```bash
# See what Prime knows about your project
/ccmem-recall-facts
```

### **Troubleshooting**
```bash
# Find relevant solutions
/ccmem-recall-facts "error" troubleshooting
```

### **Command Reference** 
```bash
# Look up specific commands
/ccmem-recall-facts "refresh" commands
```

### **Documentation Review**
```bash  
# Check learned API knowledge
/ccmem-recall-facts "" api 20
```

Perfect for verifying what Prime has learned and ensuring his knowledge is complete and accurate!