#!/bin/bash

# CCMem Portal Installation Script
# Deploys standardized CCMem portal to any project directory

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script configuration
CCMEM_ROOT="/Users/corelogic/satori-dev/ccmem"
TEMPLATE_DIR="$CCMEM_ROOT/portal-template"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${PURPLE}🚀 CCMem Portal Installation Script${NC}"
echo -e "${PURPLE}====================================${NC}"
echo ""

# Check if template directory exists
if [ ! -d "$TEMPLATE_DIR" ]; then
    echo -e "${RED}❌ Error: Portal template not found at $TEMPLATE_DIR${NC}"
    echo -e "${YELLOW}💡 Run this script from the CCMem root directory${NC}"
    exit 1
fi

# Function to show usage
show_usage() {
    echo -e "${BLUE}Usage:${NC}"
    echo "  $0 [PROJECT_DIR] [OPTIONS]"
    echo ""
    echo -e "${BLUE}Arguments:${NC}"
    echo "  PROJECT_DIR     Target project directory (default: current directory)"
    echo ""
    echo -e "${BLUE}Options:${NC}"
    echo "  -n, --name      Project name (e.g., 'app-kozan')"
    echo "  -d, --display   Project display name (e.g., 'Isle by Melis Kozan')"
    echo "  -p, --port      Server port (default: auto-assigned)"
    echo "  -h, --help      Show this help message"
    echo "  --dry-run       Show what would be created without actually creating it"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  $0 /Users/corelogic/satori-dev/clients/app-kozan --name app-kozan --display 'Isle by Melis Kozan'"
    echo "  $0 . --name ccmem --display 'CCMem Development'"
    echo "  $0 ../my-project --port 3005"
}

# Function to auto-detect project info
detect_project_info() {
    local project_dir="$1"
    local project_name=""
    local display_name=""
    
    # Try to detect from directory name
    if [ -n "$project_dir" ]; then
        project_name=$(basename "$project_dir")
        display_name=$(echo "$project_name" | sed 's/-/ /g' | sed 's/\b\w/\U&/g')
    fi
    
    # Try to detect from package.json
    if [ -f "$project_dir/package.json" ]; then
        local pkg_name=$(node -p "JSON.parse(require('fs').readFileSync('$project_dir/package.json', 'utf8')).name" 2>/dev/null || echo "")
        local pkg_desc=$(node -p "JSON.parse(require('fs').readFileSync('$project_dir/package.json', 'utf8')).description" 2>/dev/null || echo "")
        
        [ -n "$pkg_name" ] && project_name="$pkg_name"
        [ -n "$pkg_desc" ] && display_name="$pkg_desc"
    fi
    
    echo "$project_name|$display_name"
}

# Function to find available port
find_available_port() {
    local start_port="${1:-3001}"
    local port=$start_port
    
    while lsof -i :$port >/dev/null 2>&1; do
        ((port++))
        if [ $port -gt 3100 ]; then
            echo -e "${RED}❌ Error: No available ports found in range 3001-3100${NC}"
            exit 1
        fi
    done
    
    echo $port
}

# Parse command line arguments
PROJECT_DIR=""
PROJECT_NAME=""
DISPLAY_NAME=""
SERVER_PORT=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--name)
            PROJECT_NAME="$2"
            shift 2
            ;;
        -d|--display)
            DISPLAY_NAME="$2"
            shift 2
            ;;
        -p|--port)
            SERVER_PORT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        -*)
            echo -e "${RED}❌ Error: Unknown option $1${NC}"
            show_usage
            exit 1
            ;;
        *)
            if [ -z "$PROJECT_DIR" ]; then
                PROJECT_DIR="$1"
            else
                echo -e "${RED}❌ Error: Too many arguments${NC}"
                show_usage
                exit 1
            fi
            shift
            ;;
    esac
done

# Default to current directory if not specified
if [ -z "$PROJECT_DIR" ]; then
    PROJECT_DIR="$(pwd)"
fi

# Convert to absolute path
PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"

echo -e "${CYAN}📍 Target Directory: $PROJECT_DIR${NC}"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Error: Project directory does not exist: $PROJECT_DIR${NC}"
    exit 1
fi

# Auto-detect project info if not provided
if [ -z "$PROJECT_NAME" ] || [ -z "$DISPLAY_NAME" ]; then
    echo -e "${YELLOW}🔍 Auto-detecting project information...${NC}"
    detected=$(detect_project_info "$PROJECT_DIR")
    auto_name=$(echo "$detected" | cut -d'|' -f1)
    auto_display=$(echo "$detected" | cut -d'|' -f2)
    
    [ -z "$PROJECT_NAME" ] && PROJECT_NAME="$auto_name"
    [ -z "$DISPLAY_NAME" ] && DISPLAY_NAME="$auto_display"
fi

# Fallback defaults
[ -z "$PROJECT_NAME" ] && PROJECT_NAME="$(basename "$PROJECT_DIR")"
[ -z "$DISPLAY_NAME" ] && DISPLAY_NAME="$PROJECT_NAME"

# Find available port if not specified
if [ -z "$SERVER_PORT" ]; then
    echo -e "${YELLOW}🔍 Finding available port...${NC}"
    SERVER_PORT=$(find_available_port)
fi

echo ""
echo -e "${BLUE}📋 Installation Configuration:${NC}"
echo -e "${BLUE}  Project Name:     ${NC}$PROJECT_NAME"
echo -e "${BLUE}  Display Name:     ${NC}$DISPLAY_NAME"
echo -e "${BLUE}  Project Path:     ${NC}$PROJECT_DIR"
echo -e "${BLUE}  Server Port:      ${NC}$SERVER_PORT"
echo -e "${BLUE}  Base Path:        ${NC}/$PROJECT_NAME"
echo ""

# Check if portal already exists
PORTAL_DIR="$PROJECT_DIR/ccmem/portal"
if [ -d "$PORTAL_DIR" ]; then
    echo -e "${YELLOW}⚠️  Portal already exists at $PORTAL_DIR${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Installation cancelled${NC}"
        exit 0
    fi
    echo -e "${YELLOW}🗑️  Removing existing portal...${NC}"
    if [ "$DRY_RUN" = false ]; then
        rm -rf "$PORTAL_DIR"
    fi
fi

# Check if database exists
DB_PATH="$PROJECT_DIR/ccmem.db"
if [ ! -f "$DB_PATH" ]; then
    echo -e "${YELLOW}⚠️  CCMem database not found at $DB_PATH${NC}"
    echo -e "${YELLOW}💡 You may need to run database setup after portal installation${NC}"
fi

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}🔍 DRY RUN - Would create the following structure:${NC}"
    echo "$PORTAL_DIR/"
    echo "├── config.json"
    echo "├── server.js"
    echo "├── dashboard.html"
    echo "├── start.sh"
    echo "└── stop.sh"
    exit 0
fi

# Create portal directory
echo -e "${GREEN}📁 Creating portal directory...${NC}"
mkdir -p "$PORTAL_DIR"

# Copy and configure template files
echo -e "${GREEN}📋 Installing template files...${NC}"

# Copy all template files
cp "$TEMPLATE_DIR"/* "$PORTAL_DIR/"

# Make scripts executable
chmod +x "$PORTAL_DIR/start.sh"
chmod +x "$PORTAL_DIR/stop.sh"
chmod +x "$PORTAL_DIR/server.js"

# Configure config.json with project-specific values
echo -e "${GREEN}⚙️  Configuring portal settings...${NC}"
sed -i '' "s|{{PROJECT_NAME}}|$PROJECT_NAME|g" "$PORTAL_DIR/config.json"
sed -i '' "s|{{PROJECT_DISPLAY_NAME}}|$DISPLAY_NAME|g" "$PORTAL_DIR/config.json"
sed -i '' "s|{{PROJECT_PATH}}|$PROJECT_DIR|g" "$PORTAL_DIR/config.json"
sed -i '' "s|{{SERVER_PORT}}|$SERVER_PORT|g" "$PORTAL_DIR/config.json"

echo ""
echo -e "${GREEN}✅ CCMem Portal installed successfully!${NC}"
echo ""
echo -e "${BLUE}🎯 Portal Location:${NC} $PORTAL_DIR"
echo -e "${BLUE}🌐 Dashboard URL:${NC}  http://localhost:$SERVER_PORT/$PROJECT_NAME"
echo -e "${BLUE}📊 Health Check:${NC}  http://localhost:$SERVER_PORT/$PROJECT_NAME/api/health"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "${BLUE}  1.${NC} Start the portal:"
echo "     cd $PORTAL_DIR && ./start.sh"
echo ""
echo -e "${BLUE}  2.${NC} Access dashboard:"
echo "     http://localhost:$SERVER_PORT/$PROJECT_NAME"
echo ""
echo -e "${BLUE}  3.${NC} Stop the portal:"
echo "     cd $PORTAL_DIR && ./stop.sh"
echo ""

if [ ! -f "$DB_PATH" ]; then
    echo -e "${YELLOW}💡 Database Setup:${NC}"
    echo "   Database not found. You may need to:"
    echo "   • Run CCMem database initialization"
    echo "   • Copy existing ccmem.db to $PROJECT_DIR/"
    echo "   • Run database migration scripts"
    echo ""
fi

echo -e "${PURPLE}🎊 Installation complete!${NC}"