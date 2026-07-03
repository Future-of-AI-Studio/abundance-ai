// Flatten stray markdown into clean plain text. Marketing captions are copied
// straight into social composers, which render markdown literally — so `**bold**`
// and `* bullet` would show their raw markers. The AI is told to avoid markdown,
// but this defends against any that slips through (and any pre-existing posts).
export function plainText(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, '').trim()) // fenced code
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // headings
    .replace(/^\s*[-*+]\s+/gm, '• ') // bullet markers → a real bullet
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → text
    .replace(/\n{3,}/g, '\n\n') // collapse extra blank lines
    .trim();
}
