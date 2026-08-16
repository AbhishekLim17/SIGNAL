import { fetchStatic, looksLikeEmptySpa } from './staticScraper.js';
import { fetchRendered } from './headlessScraper.js';
import { extractContacts } from './extractors.js';
import { normalizeExtracted } from './normalize.js';
import { upsertContact } from '../db/contactsRepo.js';
import { logger } from '../utils/logger.js';

async function scrapeOne(url) {
  let page;
  try {
    page = await fetchStatic(url);
  } catch (err) {
    logger.warn(`Static fetch failed for ${url}, trying headless:`, err.message);
    page = null;
  }

  let usedHeadless = false;
  if (!page || looksLikeEmptySpa(page.$, page.text)) {
    try {
      page = await fetchRendered(url);
      usedHeadless = true;
    } catch (err) {
      logger.error(`Headless fetch failed for ${url}:`, err.message);
      return { url, error: err.message, contacts: [] };
    }
  }

  const rawContacts = extractContacts({ $: page.$, text: page.text, url });
  const contacts = rawContacts.map(normalizeExtracted);
  return { url, usedHeadless, contacts, error: null };
}

export async function scrapeUrls(userId, urls) {
  const results = { added: 0, merged: 0, skipped: 0, errors: [], contacts: [] };

  for (const url of urls) {
    const { contacts, error } = await scrapeOne(url);
    if (error) {
      results.errors.push({ url, error });
      continue;
    }
    if (contacts.length === 0) {
      results.skipped += 1;
      continue;
    }
    for (const c of contacts) {
      const { contact, created } = await upsertContact(userId, c);
      if (created) results.added += 1;
      else results.merged += 1;
      results.contacts.push(contact);
    }
  }

  return results;
}
