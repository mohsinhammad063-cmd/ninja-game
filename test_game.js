const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();

        // Listen for console logs
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err));

        await page.goto('http://localhost:8000/index.html');

        console.log('Page loaded. Waiting a bit...');
        await new Promise(r => setTimeout(r, 2000));

        console.log('Clicking Play...');
        await page.click('#play-btn');

        console.log('Waiting for gameplay...');
        await new Promise(r => setTimeout(r, 10000)); // wait longer

        const uiScore = await page.$eval('#ui-score', el => el.innerText);
        const powerBarWidth = await page.$eval('#power-bar-fill', el => el.style.width);

        console.log(`Current Score: ${uiScore}`);
        console.log(`Power Bar Width: ${powerBarWidth}`);

        await new Promise(r => setTimeout(r, 5000));

        try {
            const gameOverVis = await page.$eval('#game-over-screen', el => !el.classList.contains('hidden'));
            console.log('Game Over visible?', gameOverVis);
        } catch(e) {
            console.log('Could not determine game over state.');
        }

        await browser.close();
        console.log('Test complete!');
    } catch (e) {
        console.error('Test failed:', e);
        process.exit(1);
    }
})();
