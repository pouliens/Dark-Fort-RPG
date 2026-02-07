
from playwright.sync_api import sync_playwright
import os
import sys

def test_shop_functionality():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        print("Starting Game...")
        page.click("#startBtn")

        print("Opening Shop...")
        page.evaluate("openShop(true)")

        # Verify Shop Tabs
        if page.is_visible(".shop-tabs"):
            print("SUCCESS: Shop tabs visible.")
        else:
            print("FAILED: Shop tabs not visible.")
            sys.exit(1)

        # Verify Buy Tab Content
        shop_text = page.inner_text("#gameText")
        # print(f"DEBUG: Shop Text Content:\n{shop_text}")
        # Note: CSS text-transform: uppercase makes h4 uppercase in inner_text
        if "PREKEIVIO PREKĖS" in shop_text:
            print("SUCCESS: Buy tab header found.")
        else:
            print("FAILED: Buy tab header missing.")
            sys.exit(1)

        # Verify Item Presence
        if "Mikstūra" in shop_text:
             print("SUCCESS: 'Mikstūra' found in shop.")
        else:
             print("FAILED: 'Mikstūra' missing from shop.")
             sys.exit(1)

        # Verify Sell Tab
        print("Switching to Sell Tab...")
        page.click("button:text('Parduoti')")

        # We need to wait a bit for UI update or check the text
        # Since it's synchronous DOM update, it should be immediate, but Playwright might need a tick.
        # However, page.click waits for actionability.

        sell_text = page.inner_text("#gameText")
        # print(f"DEBUG: Sell Text Content:\n{sell_text}")
        if "TAVO PREKĖS" in sell_text:
            print("SUCCESS: Sell tab header found.")
        else:
            print("FAILED: Sell tab header missing.")
            sys.exit(1)

        print("SUCCESS: Shop functionality verified.")
        browser.close()

if __name__ == "__main__":
    try:
        test_shop_functionality()
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
