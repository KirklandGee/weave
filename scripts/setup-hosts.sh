#!/bin/bash

# Setup script to add localhost subdomain to /etc/hosts

HOSTS_FILE="/etc/hosts"
LOCALHOST_ENTRY="127.0.0.1 app.localhost"

# Check if the entry already exists
if grep -q "app.localhost" "$HOSTS_FILE"; then
    echo "✅ app.localhost already exists in $HOSTS_FILE"
else
    echo "Adding app.localhost to $HOSTS_FILE..."
    echo "This requires sudo privileges:"
    echo "$LOCALHOST_ENTRY" | sudo tee -a "$HOSTS_FILE" > /dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added app.localhost to $HOSTS_FILE"
    else
        echo "❌ Failed to add app.localhost to $HOSTS_FILE"
        exit 1
    fi
fi

echo ""
echo "🎉 Setup complete! You can now:"
echo "1. Run 'npm run dev' to start both apps"
echo "2. Visit http://localhost:3000 for the marketing site"
echo "3. Visit http://app.localhost:3001 for the app"
echo "4. Or use the proxy: npm run dev:proxy"