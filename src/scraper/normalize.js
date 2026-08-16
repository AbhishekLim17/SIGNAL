function cleanString(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 && trimmed.length < 200 ? trimmed : null;
}

export function normalizeExtracted(record) {
  return {
    email: record.email.toLowerCase().trim(),
    name: cleanString(record.name),
    title: cleanString(record.title),
    company: cleanString(record.company),
    phone: cleanString(record.phone),
    sourceUrl: record.sourceUrl,
    rawTextSnippet: cleanString(record.rawTextSnippet) || '',
  };
}
