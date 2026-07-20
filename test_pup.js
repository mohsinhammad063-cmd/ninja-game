const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  await page.goto('http://localhost:8000/index.html');

  // Wait for the game to load
  await page.waitForSelector('#play-btn');

  // Screenshot 1: Start Screen
  await page.screenshot({ path: 'screenshot_start.png' });
  console.log('Saved start screen screenshot');

  // Click play
  await page.click('#play-btn');
  await new Promise(r => setTimeout(r, 500));

  // Screenshot 2: Power Select Screen
  await page.screenshot({ path: 'screenshot_power_select.png' });
  console.log('Saved power select screenshot');

  // Throw weapon
  await page.mouse.click(200, 200); // Click somewhere to throw
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot 3: Gameplay
  await page.screenshot({ path: 'screenshot_gameplay.png' });
  console.log('Saved gameplay screenshot');

  // Wait for game over
  await page.waitForSelector('#game-over-screen:not(.hidden)', { timeout: 35000 });
  await new Promise(r => setTimeout(r, 500));

  // Screenshot 4: Game Over
  await page.screenshot({ path: 'screenshot_gameover.png' });
  console.log('Saved game over screenshot');

  // Go to shop
  await page.click('#shop-btn-go');
  await new Promise(r => setTimeout(r, 500));

  // Screenshot 5: Shop
  await page.screenshot({ path: 'screenshot_shop.png' });
  console.log('Saved shop screenshot');

  await browser.close();
})();
