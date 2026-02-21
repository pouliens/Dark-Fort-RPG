from playwright.sync_api import sync_playwright
import os
import sys

def test_win_condition():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Start the game
        page.click("#startBtn")

        # Simulate some progress
        page.evaluate("gameState.points = 5")
        page.evaluate("gameState.level = 4")
        page.evaluate("gameState.totalSilverCollected = 100")
        page.evaluate("gameState.monstersDefeated = 12")

        # Trigger Win
        page.evaluate("winGame()")

        # Check if Buttons are hidden
        # Note: display:none elements are considered not visible by Playwright
        explore_visible = page.is_visible("#exploreBtn")
        levelup_visible = page.is_visible("#levelUpBtn")
        scavenge_visible = page.is_visible("#scavengeBtn")

        print(f"Explore Button Visible: {explore_visible}")
        print(f"Level Up Button Visible: {levelup_visible}")
        print(f"Scavenge Button Visible: {scavenge_visible}")

        if explore_visible or levelup_visible or scavenge_visible:
            print("FAILED: Buttons should be hidden.")
            sys.exit(1)

        # Check for Stats
        # We expect specific values in the stats block.
        # The inner_text might have newlines, so we check existence.
        # Use #gameText .end-screen-stats to target the victory stats, avoiding the character sheet stats
        stats_text = page.locator("#gameText .end-screen-stats").inner_text()
        print("Stats Text Found:")
        print(stats_text)

        # We check for key phrases since formatting might vary (newlines etc)
        expected_phrases = [
            "Taškai", "5",
            "Lygis", "4",
            "Surinktas Auksas", "100",
            "Nugalėti Priešai", "12"
        ]

        for phrase in expected_phrases:
            if phrase in stats_text:
                 print(f"FOUND: {phrase}")
            else:
                 print(f"MISSING: {phrase}")
                 sys.exit(1)

        print("SUCCESS: Win condition verified.")
        browser.close()

if __name__ == "__main__":
    test_win_condition()
