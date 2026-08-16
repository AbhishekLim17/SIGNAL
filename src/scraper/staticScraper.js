import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 EmailOutreachTool/1.0';

export async function fetchStatic(url) {
  const res = await axios.get(url, {
    timeout: 10000,
    headers: { 'User-Agent': USER_AGENT },
    validateStatus: (status) => status < 400,
  });
  const $ = cheerio.load(res.data);
  $('script, style, noscript').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return { $, text, html: res.data };
}

/**
 * Heuristic signal that a page is a JS-rendered SPA whose real content
 * never showed up in the raw HTML we fetched statically.
 */
export function looksLikeEmptySpa($, text) {
  if (text.length >= 200) return false;
  const roots = ['#root', '#app', '[data-reactroot]', '#__next'];
  for (const sel of roots) {
    const el = $(sel);
    if (el.length > 0 && el.text().trim().length < 50) {
      return true;
    }
  }
  return text.length < 200;
}
