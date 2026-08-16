const EMAIL_RE = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/g;

function uniq(arr) {
  return [...new Set(arr)];
}

function extractEmails(text) {
  return uniq((text.match(EMAIL_RE) || []).map((e) => e.toLowerCase()));
}

function extractPhones(text) {
  return uniq(
    (text.match(PHONE_RE) || [])
      .map((p) => p.trim())
      .filter((p) => p.replace(/[^\d]/g, '').length >= 7)
  );
}

/**
 * Given a cheerio-loaded DOM ($) and its raw visible text, find, for each email found,
 * a best-guess name/title/company/phone using nearby DOM context and JSON-LD/meta hints.
 */
function extractStructuredFromDom($, fullText) {
  const jsonLdHints = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).contents().text());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Person' || item['@type'] === 'Organization') {
          jsonLdHints.push(item);
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  const metaAuthor = $('meta[name="author"]').attr('content') || null;

  const mailtoContext = [];
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const email = href.replace('mailto:', '').split('?')[0].toLowerCase().trim();
    if (!email) return;
    const anchorText = $(el).text().trim();
    const parentText = $(el).parent().text().trim().slice(0, 200);
    mailtoContext.push({ email, anchorText, parentText });
  });

  return { jsonLdHints, metaAuthor, mailtoContext };
}

export function extractContacts({ $, text, url }) {
  const phones = extractPhones(text);
  const { jsonLdHints, metaAuthor, mailtoContext } = extractStructuredFromDom($, text);
  // mailto: hrefs commonly carry the address even when the visible link text
  // is just a name, so emails found there must be merged with the plain-text scan.
  const emails = uniq([...extractEmails(text), ...mailtoContext.map((m) => m.email)]);

  if (emails.length === 0) {
    return [];
  }

  return emails.map((email) => {
    const mailtoHit = mailtoContext.find((m) => m.email === email);
    const personHint = jsonLdHints.find((h) => h['@type'] === 'Person');
    const orgHint = jsonLdHints.find((h) => h['@type'] === 'Organization');

    let name = null;
    let title = null;
    if (mailtoHit) {
      const candidate = mailtoHit.anchorText && !mailtoHit.anchorText.includes('@') ? mailtoHit.anchorText : null;
      name = candidate || (personHint && personHint.name) || metaAuthor || null;
      title = (personHint && personHint.jobTitle) || null;
    } else {
      name = (personHint && personHint.name) || metaAuthor || null;
      title = (personHint && personHint.jobTitle) || null;
    }

    const company = (orgHint && orgHint.name) || null;
    const nearbyPhone = phones.length > 0 ? phones[0] : null;
    const snippetSource = (mailtoHit && mailtoHit.parentText) || text.slice(0, 300);

    return {
      email,
      name,
      title,
      company,
      phone: nearbyPhone,
      sourceUrl: url,
      rawTextSnippet: snippetSource,
    };
  });
}
