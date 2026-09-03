import puppeteer from 'puppeteer';

const tipo = process.argv[2] || 'documento';
const valor = (process.argv[3] || '').trim().toUpperCase();

if (!valor) {
  console.error(JSON.stringify({ error: 'No se proporcionó criterio de búsqueda' }));
  process.exit(1);
}

async function runScraper() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1366, height: 900 });

    let rawCapturedData = null;

    page.on('response', async (res) => {
      const url = res.url();
      if (
        url.includes('estadocuenta') ||
        url.includes('consulta') ||
        url.includes('comparendo') ||
        url.includes('multas')
      ) {
        try {
          const text = await res.text();
          if (text.startsWith('{') || text.startsWith('[')) {
            const json = JSON.parse(text);
            if (
              json &&
              (Array.isArray(json.multas) ||
                json.pazSalvo !== undefined ||
                Array.isArray(json.acuerdosPago) ||
                Array.isArray(json.personasMismoDocumento))
            ) {
              rawCapturedData = json;
            }
          }
        } catch {
          // ignore
        }
      }
    });

    await page.goto('https://www.fcm.org.co/simit/#/home-public', {
      waitUntil: 'networkidle2',
      timeout: 35000,
    });

    await new Promise((r) => setTimeout(r, 2000));

    await page.evaluate((val) => {
      const input = document.getElementById('txtBusqueda');
      if (input) {
        input.value = val;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        if (window.angular) {
          const el = window.angular.element(input);
          const scope = el ? el.scope() : null;
          if (scope) {
            if (scope.i) scope.i.numDocPlaca = val;
            scope.$apply();
          }
        }
      }

      const btn =
        document.getElementById('consultar') || document.querySelector('button[type="submit"]');
      if (btn) {
        btn.click();
      }
    }, valor);

    // Esperar respuesta (máx 14s)
    for (let s = 1; s <= 14; s++) {
      await new Promise((r) => setTimeout(r, 1000));

      if (rawCapturedData && Array.isArray(rawCapturedData.multas)) {
        break;
      }

      const sessionData = await page.evaluate(() => {
        try {
          return sessionStorage.getItem('infoEstadoCuenta');
        } catch {
          return null;
        }
      });

      if (sessionData && sessionData !== 'null' && sessionData.length > 20) {
        try {
          const parsed = JSON.parse(sessionData);
          if (parsed && (Array.isArray(parsed.multas) || parsed.pazSalvo !== undefined)) {
            rawCapturedData = parsed;
            if (Array.isArray(parsed.multas) && parsed.multas.length > 0) break;
          }
        } catch {
          // ignore
        }
      }
    }

    if (rawCapturedData) {
      console.log(JSON.stringify(rawCapturedData));
    } else {
      console.log(JSON.stringify({ pazSalvo: true, multas: [], acuerdosPago: [] }));
    }
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runScraper();
