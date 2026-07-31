import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Go to local game server
        await page.goto('http://localhost:8000/index.html')

        # Wait for Start Screen
        await page.wait_for_selector('#play-btn')

        # Click Play
        await page.click('#play-btn')

        # Wait for 1 second to let first objects spawn and appear
        await page.wait_for_timeout(1000)

        # Take a screenshot at start
        await page.screenshot(path="screenshot_wave1_start.png")
        print("Captured start screenshot for Wave 1.")

        # Check power bar width to confirm we are playing
        power_bar = await page.locator('#power-bar-fill').evaluate('el => el.style.width')
        print(f"Power Bar initial width: {power_bar}")

        # Wait 5 seconds
        print("Waiting 5 seconds to measure target movement...")
        await page.wait_for_timeout(5000)

        # Take a screenshot after 5 seconds
        await page.screenshot(path="screenshot_wave1_5sec.png")
        print("Captured 5-second screenshot for Wave 1.")

        # Check power bar width to confirm player hasn't died due to fast object
        power_bar_after = await page.locator('#power-bar-fill').evaluate('el => el.style.width')
        print(f"Power Bar width after 5 seconds: {power_bar_after}")

        # Assert player didn't die instantly (if width > 0)
        width_val = float(power_bar_after.replace('%', ''))
        if width_val > 0:
            print("Target is moving slowly enough. Player has not died within 5 seconds.")
        else:
            print("ERROR: Player died too quickly. Targets might be too fast.")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(run())
