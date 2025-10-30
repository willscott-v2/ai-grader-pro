/**
 * Utility functions for generating and downloading analysis reports
 */

export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return 'analysis';
  }
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadMarkdown(markdownContent: string, url: string) {
  const domain = extractDomain(url);
  const filename = `report-card-${domain}.md`;
  // Ensure newlines are actual line breaks (LF) not escaped sequences
  const normalizedContent = markdownContent.replace(/\\n/g, '\n');
  downloadFile(normalizedContent, filename, 'text/markdown');
}

export function downloadJSON(jsonData: any, url: string) {
  const domain = extractDomain(url);
  const filename = `analysis-${domain}.json`;
  const content = JSON.stringify(jsonData, null, 2);
  downloadFile(content, filename, 'application/json');
}
