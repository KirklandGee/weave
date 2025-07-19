from backend.services.neo4j import query


def create_usage_tracking_constraints():
    """Create constraints and indexes for usage tracking nodes."""
    
    # Create constraint for UsageEvent nodes to ensure unique events
    try:
        query("""
        CREATE CONSTRAINT usage_event_id IF NOT EXISTS
        FOR (u:UsageEvent) REQUIRE (u.user_id, u.timestamp) IS UNIQUE
        """)
        print("✅ Created constraint: usage_event_id")
    except Exception as e:
        print(f"❌ Error creating usage_event_id constraint: {e}")
    
    # Create constraint for UsageLimit nodes to ensure one limit per user
    try:
        query("""
        CREATE CONSTRAINT usage_limit_user IF NOT EXISTS
        FOR (l:UsageLimit) REQUIRE l.user_id IS UNIQUE
        """)
        print("✅ Created constraint: usage_limit_user")
    except Exception as e:
        print(f"❌ Error creating usage_limit_user constraint: {e}")


def create_usage_tracking_indexes():
    """Create indexes for efficient usage tracking queries."""
    
    # Index on user_id for UsageEvent nodes
    try:
        query("""
        CREATE INDEX usage_event_user_id IF NOT EXISTS
        FOR (u:UsageEvent) ON (u.user_id)
        """)
        print("✅ Created index: usage_event_user_id")
    except Exception as e:
        print(f"❌ Error creating usage_event_user_id index: {e}")
    
    # Index on timestamp for UsageEvent nodes (for time-based queries)
    try:
        query("""
        CREATE INDEX usage_event_timestamp IF NOT EXISTS
        FOR (u:UsageEvent) ON (u.timestamp)
        """)
        print("✅ Created index: usage_event_timestamp")
    except Exception as e:
        print(f"❌ Error creating usage_event_timestamp index: {e}")
    
    # Composite index on user_id and timestamp for efficient monthly queries
    try:
        query("""
        CREATE INDEX usage_event_user_timestamp IF NOT EXISTS
        FOR (u:UsageEvent) ON (u.user_id, u.timestamp)
        """)
        print("✅ Created index: usage_event_user_timestamp")
    except Exception as e:
        print(f"❌ Error creating usage_event_user_timestamp index: {e}")
    
    # Index on model for usage analytics
    try:
        query("""
        CREATE INDEX usage_event_model IF NOT EXISTS
        FOR (u:UsageEvent) ON (u.model)
        """)
        print("✅ Created index: usage_event_model")
    except Exception as e:
        print(f"❌ Error creating usage_event_model index: {e}")
    
    # Index on campaign_id for campaign-specific usage tracking
    try:
        query("""
        CREATE INDEX usage_event_campaign IF NOT EXISTS
        FOR (u:UsageEvent) ON (u.campaign_id)
        """)
        print("✅ Created index: usage_event_campaign")
    except Exception as e:
        print(f"❌ Error creating usage_event_campaign index: {e}")


def setup_usage_tracking():
    """Set up all usage tracking database constraints and indexes."""
    print("Setting up usage tracking database schema...")
    
    create_usage_tracking_constraints()
    create_usage_tracking_indexes()
    
    print("✅ Usage tracking database setup complete!")


def check_usage_tracking_schema():
    """Check the status of usage tracking constraints and indexes."""
    try:
        # Check constraints
        constraints = query("SHOW CONSTRAINTS")
        print("Usage Tracking Constraints:")
        for record in constraints:
            constraint = record.get('record', record)
            name = constraint.get('name', '')
            if 'usage' in name.lower():
                print(f"  - {name}: {constraint.get('type', 'unknown')}")
        
        # Check indexes
        indexes = query("SHOW INDEXES")
        print("\nUsage Tracking Indexes:")
        for record in indexes:
            index = record.get('record', record)
            name = index.get('name', '')
            if 'usage' in name.lower():
                print(f"  - {name}: {index.get('state', 'unknown')} ({index.get('populationPercent', 0)}%)")
        
    except Exception as e:
        print(f"Error checking usage tracking schema: {e}")


def drop_usage_tracking_schema():
    """Drop all usage tracking constraints and indexes (useful for testing/rebuilding)."""
    try:
        # Drop constraints
        constraints_to_drop = [
            "usage_event_id",
            "usage_limit_user"
        ]
        
        for constraint_name in constraints_to_drop:
            try:
                query(f"DROP CONSTRAINT {constraint_name} IF EXISTS")
                print(f"Dropped constraint: {constraint_name}")
            except Exception as e:
                print(f"Error dropping constraint {constraint_name}: {e}")
        
        # Drop indexes
        indexes_to_drop = [
            "usage_event_user_id",
            "usage_event_timestamp", 
            "usage_event_user_timestamp",
            "usage_event_model",
            "usage_event_campaign"
        ]
        
        for index_name in indexes_to_drop:
            try:
                query(f"DROP INDEX {index_name} IF EXISTS")
                print(f"Dropped index: {index_name}")
            except Exception as e:
                print(f"Error dropping index {index_name}: {e}")
                
    except Exception as e:
        print(f"Error dropping usage tracking schema: {e}")


def clear_usage_data():
    """Clear all usage tracking data (useful for testing). Use with caution!"""
    try:
        # Delete all usage events
        result = query("MATCH (u:UsageEvent) DELETE u RETURN count(u) as deleted")
        deleted_events = result[0]["deleted"] if result else 0
        print(f"Deleted {deleted_events} usage events")
        
        # Delete all usage limits
        result = query("MATCH (l:UsageLimit) DELETE l RETURN count(l) as deleted")
        deleted_limits = result[0]["deleted"] if result else 0
        print(f"Deleted {deleted_limits} usage limits")
        
        print("⚠️  All usage tracking data has been cleared!")
        
    except Exception as e:
        print(f"Error clearing usage data: {e}")


if __name__ == "__main__":
    # Run setup when executed directly
    setup_usage_tracking()
    check_usage_tracking_schema()