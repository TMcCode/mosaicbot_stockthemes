export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function wordCountInRange(text: string, min: number, max: number): boolean {
  const n = countWords(text);
  return n >= min && n <= max;
}
