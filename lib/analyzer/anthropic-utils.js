/**
 * Text of a Claude response. Never index message.content[0]: Claude Sonnet 5.5
 * thinks by default, so the first block can be a thinking block. Refusals and
 * max_tokens cut-offs throw instead of passing partial text downstream.
 */
export function messageText(message) {
  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
  if (message.stop_reason !== 'end_turn' || !text) {
    const category = message.stop_details?.category;
    throw new Error(`Claude returned no usable text (stop_reason: ${message.stop_reason}${category ? `, category: ${category}` : ''})`);
  }
  return text;
}
