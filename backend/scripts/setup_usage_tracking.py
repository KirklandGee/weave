#!/usr/bin/env python3
"""
Script to set up usage tracking database schema in Neo4j.

This script creates the necessary constraints and indexes for the usage tracking system.
Run this once after implementing the usage tracking feature.

Usage:
    python -m backend.scripts.setup_usage_tracking
"""

import sys
import os

# Add the parent directory (ai_rpg_manager) to the Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
project_root = os.path.dirname(backend_dir)
sys.path.insert(0, project_root)

from backend.services.neo4j import verify
from backend.services.neo4j.setup_usage_tracking import (
    setup_usage_tracking,
    check_usage_tracking_schema,
    drop_usage_tracking_schema,
    clear_usage_data,
)


def main():
    """Main setup function."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Set up usage tracking database schema"
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check existing schema instead of setting up",
    )
    parser.add_argument(
        "--drop", action="store_true", help="Drop existing schema (use with caution)"
    )
    parser.add_argument(
        "--clear-data",
        action="store_true",
        help="Clear all usage data (use with extreme caution)",
    )

    args = parser.parse_args()

    try:
        # Verify Neo4j connection
        print("Verifying Neo4j connection...")
        verify()
        print("✅ Neo4j connection successful")

        if args.check:
            check_usage_tracking_schema()
        elif args.drop:
            print("⚠️  Dropping usage tracking schema...")
            confirm = input(
                "Are you sure? This will remove all constraints and indexes. (y/N): "
            )
            if confirm.lower() == "y":
                drop_usage_tracking_schema()
                print("✅ Schema dropped successfully")
            else:
                print("❌ Operation cancelled")
        elif args.clear_data:
            print("⚠️  This will DELETE ALL usage tracking data!")
            confirm = input(
                "Are you absolutely sure? This cannot be undone. Type 'DELETE' to confirm: "
            )
            if confirm == "DELETE":
                clear_usage_data()
                print("✅ Data cleared successfully")
            else:
                print("❌ Operation cancelled")
        else:
            setup_usage_tracking()

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
