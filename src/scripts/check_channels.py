# src/scripts/check_channels.py
import asyncio
import aiohttp
import re
import sys
from datetime import datetime

# Configuration
TIMEOUT = 10
MAX_CONCURRENT = 20
# Path to the channels.md file from the repository root
MD_FILE_PATH = "src/data/channels.md"

def extract_channels_from_md(file_path):
    """Extract channel usernames and their current status from the markdown table."""
    channels = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
        return []

    # Regex to find table rows and capture username and status
    # Pattern: | ... | https://t.me/USERNAME | STATUS | ... |
    pattern = r'\|.*?\|.*?https?://t\.me/([a-zA-Z0-9_]+).*?\| (Active|Inactive) \|.*?\|.*?\|'
    matches = re.findall(pattern, content)

    for username, status in matches:
        channels.append({
            "username": username,
            "current_status": status
        })
    return channels

async def check_channel_status(channel_username, session):
    """Check a single channel's status by looking for member/subscriber count."""
    url = f"https://t.me/{channel_username}"
    try:
        async with session.get(url, timeout=TIMEOUT) as resp:
            # Only read text if status is OK, otherwise assume inactive
            if resp.status != 200:
                return {"username": channel_username, "active": False}

            html = await resp.text()
            html_lower = html.lower()

            # Core logic: channel is active if it has member/subscriber count
            if re.search(r'\d+\s+(subscriber|member)', html_lower):
                return {"username": channel_username, "active": True}
            else:
                return {"username": channel_username, "active": False}

    except asyncio.TimeoutError:
        print(f"Timeout for {channel_username}")
        return {"username": channel_username, "active": False}
    except Exception as e:
        print(f"Error checking {channel_username}: {e}")
        return {"username": channel_username, "active": False}

async def main():
    print("=" * 60)
    print("Telegram Channels Status Checker")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    channels = extract_channels_from_md(MD_FILE_PATH)
    if not channels:
        print(f"No channels found or could not read {MD_FILE_PATH}. Exiting.")
        sys.exit(1)

    print(f"\nLoaded {len(channels)} channels from {MD_FILE_PATH}")

    # Check all channels concurrently
    async with aiohttp.ClientSession() as session:
        semaphore = asyncio.Semaphore(MAX_CONCURRENT)
        
        async def bounded_check(channel):
            async with semaphore:
                return await check_channel_status(channel["username"], session)
        
        tasks = [bounded_check(ch) for ch in channels]
        results = await asyncio.gather(*tasks)

    # Identify status changes
    updates = []
    for i, result in enumerate(results):
        channel = channels[i]
        new_status = "Active" if result["active"] else "Inactive"
        
        if new_status != channel["current_status"]:
            updates.append({
                "username": result["username"],
                "old_status": channel["current_status"],
                "new_status": new_status
            })

    # Report results
    print(f"\n--- Results ---")
    print(f"Total channels checked: {len(results)}")
    print(f"Status changes detected: {len(updates)}")

    if updates:
        print("\nChannels with status changes:")
        for u in updates:
            print(f"  • @{u['username']}: {u['old_status']} -> {u['new_status']}")

        # Update the markdown file
        print(f"\nUpdating {MD_FILE_PATH}...")
        try:
            with open(MD_FILE_PATH, "r", encoding="utf-8") as f:
                content = f.read()

            for u in updates:
                # This regex matches the entire table row for the specific channel
                pattern = rf'(\|.*?\|.*?https?://t\.me/{u["username"]}.*?\|) (Active|Inactive) (\|.*?\|)'
                replacement = rf'\1 {u["new_status"]} \3'
                content = re.sub(pattern, replacement, content)

            with open(MD_FILE_PATH, "w", encoding="utf-8") as f:
                f.write(content)
            
            print(f"Successfully updated {len(updates)} channel status(es).")
        except Exception as e:
            print(f"Error updating file: {e}")
            sys.exit(1)
    else:
        print("\nNo status changes detected.")

    print(f"\nFinished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")
        sys.exit(1)
