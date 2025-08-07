#!/bin/bash

# CCMem Dashboard Refresh Tool
# Updates data and opens/refreshes the visual kanban dashboard

echo "🔄 Refreshing CCMem Dashboard..."

# Export latest CCMem data to JSONP
python3 ccmem_export.py

if [ $? -eq 0 ]; then
    echo "✅ Data refreshed successfully!"
    
    # Check if dashboard is already open in Brave
    DASHBOARD_URL="file:///Users/corelogic/satori-dev/ccmem/ccmem-dashboard.html"
    
    # Try to refresh existing Brave tab first
    if pgrep -f "Brave Browser" > /dev/null; then
        echo "🔄 Attempting to refresh existing Brave tab..."
        # AppleScript to refresh if tab exists, otherwise open new
        osascript <<EOF
tell application "Brave Browser"
    set refreshed to false
    repeat with w in windows
        repeat with t in tabs of w
            if URL of t contains "ccmem-dashboard.html" then
                tell t to reload
                set refreshed to true
                set active tab index of w to index of t
                set index of w to 1
                exit repeat
            end if
        end repeat
        if refreshed then exit repeat
    end repeat
    
    if not refreshed then
        -- Open new tab if not found
        tell window 1 to make new tab with properties {URL:"$DASHBOARD_URL"}
    end if
    
    activate
end tell
EOF
    else
        echo "🌐 Opening dashboard in Brave Browser..."
        open -a "Brave Browser" "$DASHBOARD_URL"
    fi
    
    echo ""
    echo "✅ CCMem Dashboard ready!"
    echo "📊 Dashboard: $DASHBOARD_URL"
    echo "💡 Prime can now answer questions about the visual kanban board"
    
else
    echo "❌ Failed to refresh data"
    exit 1
fi