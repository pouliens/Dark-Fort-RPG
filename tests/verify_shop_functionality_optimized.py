
from playwright.sync_api import sync_playwright
import os
import sys

def test_shop_functionality():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Block external resources to speed up loading and prevent timeouts
        page.route("**/*", lambda route: route.continue_() if not any(x in route.request.url for x in ["fonts.googleapis.com", "fonts.gstatic.com", "sfxr.me"]) else route.abort())

        print("Navigating to app...")
        page.goto("http://localhost:8000/index.html", wait_until="commit")

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

        sell_text = page.inner_text("#gameText")
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
