/**
 * Puppeteer-based schema detector
 * Detects both static and GTM-injected JSON-LD schemas
 */

const isDev = process.env.NODE_ENV === 'development';

let puppeteerCore;
let puppeteer;
let chromium;

// Lazy load dependencies
async function loadDependencies() {
  if (!puppeteerCore) {
    puppeteerCore = await import('puppeteer-core');
  }
  if (!puppeteer) {
    try {
      puppeteer = await import('puppeteer');
    } catch (e) {
      // Optional; dev-only convenience
    }
  }
  if (!chromium) {
    chromium = await import('@sparticuz/chromium');
  }
}

/**
 * Extract JSON-LD schemas from a URL using Puppeteer
 * @param {string} url - The URL to extract schemas from
 * @returns {Promise<{success: boolean, schemas: Array, count: number, timing: object}>}
 */
export async function extractSchemasWithPuppeteer(url) {
  const startTime = Date.now();
  let browser;

  try {
    await loadDependencies();

    console.log(`   → Launching Puppeteer for schema extraction...`);

    // Configure browser for environment
    if (puppeteer && puppeteer.default?.executablePath) {
      // Prefer Puppeteer's bundled Chromium when available (works on macOS dev)
      console.log(`   → Using Puppeteer bundled Chromium`);
      browser = await puppeteer.default.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    } else {
      // Serverless/runtime-compatible: @sparticuz/chromium
      const launchOptions = {
        args: chromium.default.args,
        defaultViewport: chromium.default.defaultViewport,
        executablePath: await chromium.default.executablePath(),
        headless: chromium.default.headless,
      };
      browser = await puppeteerCore.default.launch(launchOptions);
    }
    const page = await browser.newPage();

    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Block unnecessary resources to speed up loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log(`   → Navigating to ${url}...`);
    const navStart = Date.now();

    // Navigate and wait for network to be mostly idle
    await page.goto(url, {
      waitUntil: 'networkidle2', // More tolerant; wait for <=2 network connections
      timeout: 60000,
    });

    const navTime = Date.now() - navStart;
    console.log(`   → Page loaded in ${navTime}ms`);

    // Wait for GTM to potentially inject schemas
    console.log(`   → Waiting for GTM/dynamic scripts to execute...`);
    const gtmStart = Date.now();

    // Try to detect GTM dataLayer
    try {
      await page.waitForFunction(
        () => window.dataLayer && window.dataLayer.length > 0,
        { timeout: 3000 }
      );
      console.log(`   ✓ GTM dataLayer detected`);
    } catch (e) {
      console.log(`   ℹ No GTM dataLayer found (not an error)`);
    }

    // Additional wait for late-loading scripts (GTM/Vimeo)
    await new Promise(resolve => setTimeout(resolve, 4000));

    const gtmTime = Date.now() - gtmStart;
    console.log(`   → Waited ${gtmTime}ms for dynamic content`);

    // Extract all JSON-LD schemas from the page and all frames (e.g., Vimeo, GTM iframes)
    console.log(`   → Extracting JSON-LD schemas (including iframes)...`);
    const extractStart = Date.now();

    const frames = page.frames();
    const results = await Promise.all(frames.map(async (frame, frameIdx) => {
      try {
        return await frame.evaluate((idx) => {
          const collected = [];
          const scripts = Array.from(document.querySelectorAll('script[type^="application/ld+json"]'));
          scripts.forEach((script, sidx) => {
            try {
              const content = script.textContent || script.innerHTML;
              const data = JSON.parse(content);
              const list = Array.isArray(data) ? data : (data && Array.isArray(data['@graph'])) ? data['@graph'] : [data];
              list.forEach(schema => {
                if (schema && schema['@type']) {
                  collected.push({
                    ...schema,
                    _meta: {
                      scriptIndex: sidx,
                      location: script.closest('head') ? 'head' : 'body',
                      frameIndex: idx,
                    }
                  });
                }
              });
            } catch (e) {
              // skip
            }
          });
          return collected;
        }, frameIdx);
      } catch (e) {
        return [];
      }
    }));

    const schemas = results.flat();

    const extractTime = Date.now() - extractStart;
    console.log(`   ✓ Extracted ${schemas.length} schemas in ${extractTime}ms`);

    // Log schema types found
    if (schemas.length > 0) {
      const types = schemas.map(s => s['@type']).filter(Boolean);
      console.log(`   ✓ Schema types found: ${types.join(', ')}`);
    }

    const totalTime = Date.now() - startTime;

    return {
      success: true,
      schemas,
      count: schemas.length,
      timing: {
        total: totalTime,
        navigation: navTime,
        gtmWait: gtmTime,
        extraction: extractTime,
      },
      url,
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`   ✗ Puppeteer schema extraction failed:`, error.message);

    return {
      success: false,
      error: error.message,
      schemas: [],
      count: 0,
      timing: {
        total: totalTime,
      },
      url,
    };
  } finally {
    if (browser) {
      await browser.close();
      console.log(`   → Browser closed`);
    }
  }
}

/**
 * Extract schemas with retry logic
 * @param {string} url
 * @param {number} maxRetries
 * @returns {Promise<object>}
 */
export async function extractSchemasWithRetry(url, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await extractSchemasWithPuppeteer(url);

      if (result.success && result.schemas.length > 0) {
        return result;
      }

      if (attempt < maxRetries) {
        console.log(`   ℹ Attempt ${attempt} found no schemas, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(`   ⚠ Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  return { success: true, schemas: [], count: 0, timing: {}, url };
}
