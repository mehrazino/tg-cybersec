# src/scripts/check_channels.py
# GitHub Actions compatible version - No proxy required
# Checks Telegram channel status using tgme_page_extra and tgme_page_photo/title detection

import asyncio
import aiohttp
import re
import sys
import os
from datetime import datetime

# ===== CONFIGURATION =====
TIMEOUT = 15
MAX_CONCURRENT = 5
MD_FILE_PATH = "src/data/channels.md"
DRY_RUN = False
# =========================

def extract_channels_from_md(file_path):
    """
    Extract channel usernames and their current status from channels.md.
    Supports both public (t.me/username) and private (t.me/+code) channels.
    """
    channels = []
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            print(f"📄 File content length: {len(content)} characters")
    except FileNotFoundError:
        print(f"❌ File not found: {file_path}")
        return []
    
    # Patterns for public and private channels
    public_pattern = r'https?://t\.me/([a-zA-Z0-9_]+)'
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
    
    # Extract current status for each channel
    for username in unique_usernames:
        escaped_username = re.escape(username)
        row_pattern = rf'\|.*?{escaped_username}.*?\| (active|inactive) \|'
        row_match = re.search(row_pattern, content, re.IGNORECASE)
        
        if row_match:
            current_status = row_match.group(1).strip().lower()
        else:
            current_status = 'unknown'
        
        channels.append({
            "username": username,
            "current_status": current_status
        })
    
    print(f"📊 Found {len(channels)} channels")
    for ch in channels[:5]:
        print(f"   • {ch['username']}: current status '{ch['current_status']}'")
    
    return channels

async def check_channel_status(channel_username, session):
    """
    Check a single Telegram channel to determine if it's active.
    Logic:
    - If 'tgme_page_extra' exists -> Active (public channel with members)
    - If 'tgme_page_photo' and 'tgme_page_title' exist -> Active (private/public channel)
    - Otherwise -> Inactive (deleted or not found)
    """
    url = f"https://t.me/{channel_username}"
    
    try:
        async with session.get(url, timeout=TIMEOUT) as resp:
            text = await resp.text()
            
            is_active = False
            
            # Check for subscriber count element
            if 'tgme_page_extra' in text:
                is_active = True
            # Check for channel photo and title (works for private channels)
            elif 'tgme_page_photo' in text and 'tgme_page_title' in text:
                is_active = True
            
            return {"username": channel_username, "active": is_active}
                
    except asyncio.TimeoutError:
        print(f"⏱️ Timeout: {channel_username}")
        return {"username": channel_username, "active": False}
    except Exception as e:
        print(f"❌ Error: {channel_username} - {str(e)[:50]}")
        return {"username": channel_username, "active": False}

async def main():
    print("=" * 70)
    print("Telegram Channels Status Checker")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"DRY RUN: {DRY_RUN}")
    print(f"Target file: {os.path.abspath(MD_FILE_PATH)}")
    print("=" * 70)
    
    # Extract channels from markdown file
    channels = extract_channels_from_md(MD_FILE_PATH)
    if not channels:
        print("No channels found. Exiting.")
        sys.exit(1)
    
    # Use TCPConnector for better connection management
    connector = aiohttp.TCPConnector(limit=MAX_CONCURRENT, limit_per_host=MAX_CONCURRENT)
    
    async with aiohttp.ClientSession(connector=connector) as session:
        semaphore = asyncio.Semaphore(MAX_CONCURRENT)
        
        async def bounded_check(channel):
            async with semaphore:
                print(f"🔍 Checking: {channel['username']}")
                return await check_channel_status(channel["username"], session)
        
        tasks = [bounded_check(ch) for ch in channels]
        results = await asyncio.gather(*tasks)
    
    # Compare results and identify needed updates
    updates = []
    for i, result in enumerate(results):
        channel = channels[i]
        new_status = "active" if result["active"] else "inactive"
        
        # Update if status changed or current status is not recognized
        if new_status != channel["current_status"] or channel["current_status"] == 'unknown':
            updates.append({
                "username": result["username"],
                "old_status": channel["current_status"],
                "new_status": new_status
            })
    
    # Print summary
    active_count = sum(1 for r in results if r["active"])
    print(f"\n📊 Results:")
    print(f"   Total checked: {len(results)}")
    print(f"   Active channels: {active_count}")
    print(f"   Inactive channels: {len(results) - active_count}")
    print(f"   Status changes needed: {len(updates)}")
    
    # Apply updates
    if updates:
        print(f"\n🔄 Channels to update:")
        for u in updates:
            print(f"   • {u['username']}: '{u['old_status']}' → '{u['new_status']}'")
        
        if DRY_RUN:
            print(f"\n⚠️ DRY RUN - No changes were made to the file.")
        else:
            try:
                with open(MD_FILE_PATH, "r", encoding="utf-8") as f:
                    content = f.read()
                
                for u in updates:
                    escaped_username = re.escape(u['username'])
                    # Match the status column (active/inactive) and replace
                    pattern = rf'(\|.*?{escaped_username}.*?\|) (active|inactive) (\|)'
                    replacement = rf'\1 {u["new_status"]} \3'
                    content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
                
                with open(MD_FILE_PATH, "w", encoding="utf-8") as f:
                    f.write(content)
                
                print(f"\n✅ Updated {len(updates)} channel status(es) in {MD_FILE_PATH}")
                
            except Exception as e:
                print(f"\n❌ Error updating file: {e}")
                sys.exit(1)
    else:
        print(f"\n✅ No status changes needed")
    
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
