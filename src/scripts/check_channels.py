# src/scripts/check_channels.py
# GitHub Actions compatible version - No proxy required
# This script checks Telegram channel statuses and updates channels.md

import asyncio
import aiohttp
import re
import sys
import os
from datetime import datetime

# ===== CONFIGURATION =====
# No proxy needed for GitHub Actions (runs on GitHub servers)
TIMEOUT = 15
MAX_CONCURRENT = 10
# Path to channels.md from repository root
MD_FILE_PATH = "src/data/channels.md"

# Safety settings
DRY_RUN = False  # Set to True for testing without writing changes
CREATE_BACKUP = True  # Creates timestamped backup before making changes
# =========================

def backup_file(file_path):
    """
    Create a timestamped backup of the file before making changes.
    Returns the backup file path or None if backup failed.
    """
    if not CREATE_BACKUP:
        return None
    
    backup_path = f"{file_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        with open(backup_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ Backup created: {backup_path}")
        return backup_path
    except Exception as e:
        print(f"⚠️ Backup failed: {e}")
        return None

def extract_channels_from_md(file_path):
    """
    Parse channels.md file to extract channel usernames and their current status.
    Supports both public (t.me/username) and private (t.me/+code) channels.
    Returns a list of channel dictionaries.
    """
    channels = []
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            print(f"📄 File content length: {len(content)} characters")
    except FileNotFoundError:
        print(f"❌ File not found: {file_path}")
        return []
    
    # Pattern for public channels: https://t.me/username
    public_pattern = r'https?://t\.me/([a-zA-Z0-9_]+)'
    # Pattern for private channels: https://t.me/+code
    private_pattern = r'https?://t\.me/(\+[a-zA-Z0-9_-]+)'
    
    public_matches = re.findall(public_pattern, content)
    private_matches = re.findall(private_pattern, content)
    
    all_usernames = public_matches + private_matches
    
    # Remove duplicates while preserving order
    unique_usernames = []
    seen = set()
    for username in all_usernames:
        if username not in seen:
            seen.add(username)
            unique_usernames.append(username)
    
    # Extract current status for each channel from the markdown table
    for username in unique_usernames:
        escaped_username = re.escape(username)
        # Match the status column in the table row
        row_pattern = rf'\|.*?{escaped_username}.*?\| ([^|]+) \|'
        row_match = re.search(row_pattern, content)
        
        if row_match:
            current_status_raw = row_match.group(1).strip()
            # Store original status as it appears in the file
            current_status_original = current_status_raw
            # Normalize to lowercase for comparison
            if current_status_raw.lower() == 'active':
                current_status = 'active'
            else:
                current_status = 'inactive'
        else:
            current_status_original = 'unknown'
            current_status = 'inactive'
        
        channels.append({
            "username": username,
            "current_status": current_status,
            "original_status": current_status_original
        })
    
    print(f"📊 Found {len(channels)} channels")
    for ch in channels[:5]:
        print(f"   • {ch['username']}: file says '{ch['original_status']}' -> normalized to '{ch['current_status']}'")
    
    return channels

async def check_channel_status(channel_username, session):
    """
    Check a single Telegram channel to determine if it's active.
    A channel is considered active if it contains any of the keywords
    (subscriber, member, or their Persian equivalents).
    """
    url = f"https://t.me/{channel_username}"
    
    try:
        async with session.get(url, timeout=TIMEOUT) as resp:
            html = await resp.text()
            html_lower = html.lower()
            
            # Keywords that indicate a channel has members/subscribers
            # English and Persian variants
            keywords = [
                'subscriber', 'subscribers', 'member', 'members',
                'مشترک', 'عضو', 'کاربر', 'followers'
            ]
            is_active = any(keyword in html_lower for keyword in keywords)
            
            return {"username": channel_username, "active": is_active}
                
    except asyncio.TimeoutError:
        print(f"⏱️ Timeout: {channel_username}")
        return {"username": channel_username, "active": False}
    except Exception as e:
        print(f"❌ Error: {channel_username} - {str(e)[:50]}")
        return {"username": channel_username, "active": False}

async def main():
    """
    Main function orchestrating the channel checking process:
    1. Parse channels.md file
    2. Check each channel's status concurrently
    3. Compare results with current status
    4. Update the file if changes are needed
    """
    print("=" * 70)
    print("Telegram Channels Status Checker (GitHub Actions Compatible)")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"DRY RUN: {DRY_RUN}")
    print(f"Working directory: {os.getcwd()}")
    print(f"Target file: {os.path.abspath(MD_FILE_PATH)}")
    print("=" * 70)
    
    # Extract channels from markdown file
    channels = extract_channels_from_md(MD_FILE_PATH)
    if not channels:
        print("No channels found. Exiting.")
        sys.exit(1)
    
    # Use regular ClientSession (no proxy needed for GitHub Actions)
    async with aiohttp.ClientSession() as session:
        # Limit concurrent requests to avoid rate limiting
        semaphore = asyncio.Semaphore(MAX_CONCURRENT)
        
        async def bounded_check(channel):
            async with semaphore:
                return await check_channel_status(channel["username"], session)
        
        tasks = [bounded_check(ch) for ch in channels]
        results = await asyncio.gather(*tasks)
    
    # Compare results and identify needed updates
    updates = []
    for i, result in enumerate(results):
        channel = channels[i]
        new_status = "active" if result["active"] else "inactive"
        
        # Update if: logical status changed OR original format needs normalization
        # This ensures all statuses become lowercase 'active'/'inactive'
        if new_status != channel["current_status"] or channel["original_status"].lower() != channel["original_status"]:
            updates.append({
                "username": result["username"],
                "old_status": channel["original_status"],
                "new_status": new_status
            })
    
    # Print results summary
    print(f"\n📊 Results:")
    print(f"   Total checked: {len(results)}")
    print(f"   Channels to update: {len(updates)}")
    
    # Apply updates if any
    if updates:
        print(f"\n🔄 Channels that will be updated:")
        for u in updates:
            print(f"   • {u['username']}: '{u['old_status']}' → '{u['new_status']}'")
        
        if DRY_RUN:
            print(f"\n⚠️ DRY RUN - No changes were made to the file.")
        else:
            # Create backup before modifying
            backup_file(MD_FILE_PATH)
            
            try:
                # Read the current file content
                with open(MD_FILE_PATH, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # Apply each status update
                for u in updates:
                    escaped_username = re.escape(u['username'])
                    # Pattern matches the status column in the table row
                    pattern = rf'(\|.*?{escaped_username}.*?\|) [^|]+ (\|)'
                    replacement = rf'\1 {u["new_status"]} \2'
                    content = re.sub(pattern, replacement, content)
                
                # Write the updated content back to file
                with open(MD_FILE_PATH, "w", encoding="utf-8") as f:
                    f.write(content)
                
                print(f"\n✅ Updated {len(updates)} channel status(es) in {MD_FILE_PATH}")
                print(f"   File size after update: {len(content)} characters")
                
            except Exception as e:
                print(f"\n❌ Error updating file: {e}")
                sys.exit(1)
    else:
        print(f"\n✅ No updates needed")
    
    print(f"\nFinished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        sys.exit(1)
