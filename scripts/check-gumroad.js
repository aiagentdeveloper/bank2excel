import { config } from '../src/config.js';

const gumroadApi = config.gumroadApiBase || 'https://api.gumroad.com/v2';

async function main() {
  if (!config.gumroadToken || !config.gumroadProductId) {
    console.error('GUMROAD_ACCESS_TOKEN / GUMROAD_PRODUCT_ID .env icinde bos.');
    console.error('Once Gumroad uzerinden token + product permalink alin (README adimlari).');
    process.exit(1);
  }

  console.log('Gumroad baglantisini kontrol ediyorum...');
  const url = `${gumroadApi}/products/${encodeURIComponent(config.gumroadProductId)}?access_token=${encodeURIComponent(config.gumroadToken)}`;

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  } catch {
    console.error('Gumroad API erisilemedi (ag/network).');
    process.exit(1);
  }

  let body;
  try {
    body = await res.json();
  } catch {
    console.error('Beklenmeyen yanit (status ' + res.status + ').');
    process.exit(1);
  }

  if (res.status === 200 && body.success && body.product) {
    const p = body.product;
    console.log('OK! Baglanti calisiyor.');
    console.log('  Urun      :', p.name);
    console.log('  Permalink :', p.permalink);
    console.log('  Fiyat     :', p.price ? '$' + Number(p.price) / 100 : '(yok)', p.customizable_price ? '(custom)' : '');
    console.log('  Checkout  :', 'https://' + (process.env.GUMROAD_CHECKOUT_URL || '') || '(GUMROAD_CHECKOUT_URL .env\'de bos)');
    if (p.file_license_key === false) {
      console.warn('  UYARI: bu urun License Key tipinde degil! Gumroad urun ayarlarinda "license key" saticisi olarak isaretleyin.');
    } else {
      console.log('  Tip       : license-key urunu - OK');
    }
  } else if (body.message) {
    console.error('HATA:', body.message);
    if (res.status === 401) {
      console.error('-> Access token yanlis olabilir (Gumroad > Settings > Advanced > API).');
    } else if (res.status === 404) {
      console.error('-> Product permalink yanlis olabilir (url\'deki /l/<permalink> kismi).');
    }
    process.exit(1);
  } else {
    console.error('HATA: beklenmeyen yanit (status ' + res.status + ').');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});