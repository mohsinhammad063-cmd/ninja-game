const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });

        // Listen for console logs
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err));

        await page.goto('http://localhost:8000/index.html');
        console.log('Page loaded.');
        await new Promise(r => setTimeout(r, 1000));

        // 1. Test START -> SHOP -> START
        console.log('Testing START -> SHOP -> START');
        await page.click('#shop-btn-start');
        await new Promise(r => setTimeout(r, 500));

        let shopVisible = await page.$eval('#shop-screen', el => !el.classList.contains('hidden'));
        if (!shopVisible) throw new Error('Shop not visible from START');

        // Verify button is visible and centered
        let isCentered = await page.evaluate(() => {
            const btn = document.getElementById('shop-exit-button');
            const rect = btn.getBoundingClientRect();
            const containerRect = document.querySelector('.shop-actions').getBoundingClientRect();
            // check if centered horizontally within its container
            const leftDist = rect.left - containerRect.left;
            const rightDist = containerRect.right - rect.right;
            return Math.abs(leftDist - rightDist) < 2; // close enough
        });
        if (!isCentered) throw new Error('Exit button is not centered');

        await page.click('#shop-exit-button');
        await new Promise(r => setTimeout(r, 500));

        let startVisible = await page.$eval('#start-screen', el => !el.classList.contains('hidden'));
        if (!startVisible) throw new Error('Did not return to START');

        // 2. Test PAUSED -> SHOP -> PAUSED
        console.log('Testing PAUSED -> SHOP -> PAUSED');
        await page.click('#play-btn');
        await new Promise(r => setTimeout(r, 1000)); // wait for play state

        await page.keyboard.press('Escape'); // pause
        await new Promise(r => setTimeout(r, 500));

        await page.click('#shop-btn-pause');
        await new Promise(r => setTimeout(r, 500));

        shopVisible = await page.$eval('#shop-screen', el => !el.classList.contains('hidden'));
        if (!shopVisible) throw new Error('Shop not visible from PAUSED');

        await page.click('#shop-exit-button');
        await new Promise(r => setTimeout(r, 500));

        let pauseVisible = await page.$eval('#pause-screen', el => !el.classList.contains('hidden'));
        if (!pauseVisible) throw new Error('Did not return to PAUSED');

        // 3. Test Escape key in SHOP
        console.log('Testing Escape key in SHOP');
        await page.click('#shop-btn-pause');
        await new Promise(r => setTimeout(r, 500));

        await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 500));

        pauseVisible = await page.$eval('#pause-screen', el => !el.classList.contains('hidden'));
        if (!pauseVisible) throw new Error('Escape key did not return to PAUSED from SHOP');

        // 4. Test scrolling visibility (mobile viewport simulation)
        console.log('Testing button visibility after scrolling');
        await page.setViewport({ width: 375, height: 667 });

        // Ensure we are in START state by quitting
        await page.click('#confirm-quit-btn');
        await new Promise(r => setTimeout(r, 500));
        await page.click('#do-quit-btn');
        await new Promise(r => setTimeout(r, 500));

        await page.click('#shop-btn-start');
        await new Promise(r => setTimeout(r, 500));

        // Scroll to bottom
        await page.evaluate(() => {
            const shop = document.getElementById('shop-screen');
            shop.scrollTop = shop.scrollHeight;
        });
        await new Promise(r => setTimeout(r, 500));

        let isIntersecting = await page.evaluate(() => {
            return new Promise(resolve => {
                const btn = document.getElementById('shop-exit-button');
                const observer = new IntersectionObserver((entries) => {
                    resolve(entries[0].isIntersecting);
                });
                observer.observe(btn);
            });
        });

        if (!isIntersecting) throw new Error('Exit button is not visible on mobile viewport after scroll');

        await browser.close();
        console.log('All Shop tests passed!');
    } catch (e) {
        console.error('Test failed:', e);
        if (browser) await browser.close();
        process.exit(1);
    }
})();
