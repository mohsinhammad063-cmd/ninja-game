import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        await page.goto('http://localhost:8000/index.html')

        await page.wait_for_selector('#play-btn')
        await page.click('#play-btn')

        # wait slightly more than 1 second to ensure wave spawns
        await page.wait_for_timeout(2000)

        wave_objects = await page.evaluate('''() => {
            return window.getActiveObjects().map(obj => ({
                name: obj.data.name,
                isBoss: obj.isBoss,
                isPowerup: obj.isPowerup,
                hp: obj.hp,
                coins: obj.data.coins
            }));
        }''')

        crates = [obj for obj in wave_objects if not obj['isPowerup'] and not obj['isBoss']]
        print(f"Crates spawned: {len(crates)}")
        assert len(crates) == 7, f"Expected 7 crates, got {len(crates)}"

        normal_crates = [c for c in crates if c['name'] == 'Normal Crate']
        golden_crates = [c for c in crates if c['name'] == 'Golden Crate']

        print(f"Normal crates: {len(normal_crates)}")
        print(f"Golden crates: {len(golden_crates)}")

        assert len(normal_crates) == 5, f"Expected 5 normal crates, got {len(normal_crates)}"
        assert len(golden_crates) == 2, f"Expected 2 golden crates, got {len(golden_crates)}"

        assert normal_crates[0]['coins'] == 5, f"Expected Normal Crate to give 5 coins, got {normal_crates[0]['coins']}"
        assert golden_crates[0]['coins'] == 25, f"Expected Golden Crate to give 25 coins, got {golden_crates[0]['coins']}"

        await browser.close()
        print("Wave economy test passed!")

if __name__ == '__main__':
    asyncio.run(run())
