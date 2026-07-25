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

  // Go to shop by exiting the game
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));
  await page.click('#confirm-quit-btn');
  await new Promise(r => setTimeout(r, 500));
  await page.click('#do-quit-btn');
  await new Promise(r => setTimeout(r, 500));

  await page.click('#shop-btn-start');
  await new Promise(r => setTimeout(r, 500));

  // Screenshot 5: Shop
  await page.screenshot({ path: 'screenshot_shop.png' });
  console.log('Saved shop screenshot');

  await browser.close();
})();
