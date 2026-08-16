export function buildPrompt(contact, campaign) {
  const name = contact.name || 'there';
  const companyLine = contact.company
    ? `They work at ${contact.company}.`
    : 'Their company is unknown - do not invent one.';
  const titleLine = contact.title ? `Their role is ${contact.title}.` : '';
  const context = contact.rawTextSnippet
    ? `Context scraped from their webpage (use only if relevant, do not quote verbatim): "${contact.rawTextSnippet}"`
    : '';

  const keyPoints = campaign.keyPoints.length > 0
    ? campaign.keyPoints.map((p) => `- ${p}`).join('\n')
    : '- (no specific points provided)';

  return `You are drafting a short, personalized outreach email on behalf of ${campaign.senderName}${
    campaign.senderTitle ? `, ${campaign.senderTitle}` : ''
  }${campaign.senderCompany ? ` at ${campaign.senderCompany}` : ''}.

Recipient: ${name}. ${companyLine} ${titleLine}
${context}

Purpose of this email: ${campaign.purpose}
Tone: ${campaign.tone}
Key points to include:
${keyPoints}
Call to action: ${campaign.callToAction}

Rules:
- Do not fabricate facts about the recipient beyond what is given above.
- Keep the body under 150 words, no markdown, plain text with line breaks.
- Sign off with "${campaign.senderName}".
- Respond with STRICT JSON ONLY, no code fences, in exactly this shape:
{"subject": "...", "body": "..."}`;
}
