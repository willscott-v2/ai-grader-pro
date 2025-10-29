import fs from 'fs';
import csv from 'csv-parser';

/**
 * Parse survey CSV and extract entries
 * @param {string} filepath - Path to CSV file
 * @returns {Promise<Array>}
 */
export function parseSurveyCSV(filepath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filepath)
      .pipe(csv())
      .on('data', (row) => {
        // Extract relevant fields from survey
        const keywords = row['Please provide a keyword or two for which you\'d like your website / programs to rank.'];
        const url = row['Please provide the URL to a piece of content you\'d like analyzed (ideally not your homepage).'];
        const name = row['Name'];
        const email = row['Email'];
        const session = row['Which AI Search Lab are you attending?'];

        // Skip rows without both keyword and URL
        if (!keywords || !url || keywords.trim() === '' || url.trim() === '') {
          return;
        }

        // Split multiple URLs (handle "and", ",", "or", "\n")
        const urlSeparators = /\s+and\s+|\s+or\s+|,|\n/i;
        const urlList = url.split(urlSeparators)
          .map(u => u.trim())
          .filter(u => u && u.startsWith('http'));

        // If no valid URLs found, use original
        if (urlList.length === 0) {
          urlList.push(url.trim());
        }

        // Split multiple keywords
        const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);

        // Create an entry for each URL/keyword combination
        // If multiple URLs, use first keyword for first URL, etc.
        if (urlList.length === 1) {
          // Single URL: create entry for each keyword
          keywordList.forEach(keyword => {
            results.push({
              name,
              email,
              session,
              keyword,
              url: urlList[0],
            });
          });
        } else {
          // Multiple URLs: pair with keywords
          urlList.forEach((singleUrl, index) => {
            const keyword = keywordList[index] || keywordList[0] || 'general';
            results.push({
              name,
              email,
              session,
              keyword,
              url: singleUrl,
            });
          });
        }
      })
      .on('end', () => {
        console.log(`✓ Parsed ${results.length} entries from survey`);
        resolve(results);
      })
      .on('error', reject);
  });
}
