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

        # Simulate measuring distance for Wave 1, Wave 5, Wave 10
        # Wait, instead of manually tracking position, we will evaluate JS to compute travel distance in 5 seconds

        distance_script = """
        async () => {
            return new Promise((resolve) => {
                const waveSpawns = window.getRunRef().wave;

                // Clear active objects to measure fresh spawn
                window.getRunRef().activeObjects = [];
                // wait to spawn
                setTimeout(() => {
                    // Check first object speed in activeObjects?
                    // Actually, let's just get the speed from getTargetForwardSpeed for wooden crate.
                    // Oh, we can't easily access getTargetForwardSpeed since it's unexported.
                    // But we exported it through the debugSpeedInfo window object when it runs.
                    // The easiest way is to let the game spawn an object and read its Z position.
                }, 100);
            });
        }
        """

        async def measure_wave_distance(wave):
            print(f"\\n--- Measuring Wave {wave} ---")
            await page.evaluate(f'window.getRunRef().wave = {wave}')
            await page.wait_for_timeout(500)

            # Start measurement
            await page.evaluate('''
                window.testStartZ = null;
                window.testObj = null;
                // find the first object
                if (window.getRunRef) {
                    // we need to access active objects but they aren't exposed directly.
                    // The easiest way is to check the debug display!
                }
            ''')
            # Since activeObjects is not exported, we can just read the debug UI speed value.
            # wait 1 second for a spawn to happen and populate window.debugSpeedInfo
            await page.wait_for_timeout(1000)

            final_speed_str = await page.evaluate('window.debugSpeedInfo ? window.debugSpeedInfo.finalSpeed : "0"')
            engine_speed = float(final_speed_str) * 5.416

            print(f"Wave {wave} relative final speed: {final_speed_str}")
            distance_in_5s = engine_speed * 5
            print(f"Wave {wave} distance in 5s: {distance_in_5s}")
            return distance_in_5s

        dist_w1 = await measure_wave_distance(1)
        dist_w5 = await measure_wave_distance(5)
        dist_w10 = await measure_wave_distance(10)

        assert dist_w10 > dist_w5 > dist_w1, "Speed did not increase across waves as expected!"
        print("Test passed: Wave 10 > Wave 5 > Wave 1")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(run())
