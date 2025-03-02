import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Extract surah and verse numbers from text using regex
export function extractSurahVerse(text: string): {
  surah: number | null;
  verse: number | null;
} {
  // Look for patterns like "Surah 2 verse 255" or "2:255" or "Chapter 2, Verse 255"
  const patterns = [
    /surah\s+(\d+)\s+(?:verse|ayah)\s+(\d+)/i,
    /chapter\s+(\d+)\s+(?:verse|ayah)\s+(\d+)/i,
    /(\d+):(\d+)/,
    /(\d+)[\s,]+(?:verse|ayah)\s+(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        surah: parseInt(match[1], 10),
        verse: parseInt(match[2], 10),
      };
    }
  }

  return { surah: null, verse: null };
}

// Format display name for Surah
export function formatSurahName(
  number: number,
  name: string,
  englishName: string
): string {
  return `${number}. ${englishName} (${name})`;
}

// Get user initials from name or email
export function getUserInitials(
  name: string | null,
  email: string | null
): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }

  if (email) {
    return email.substring(0, 2).toUpperCase();
  }

  return "UN";
}

/**
 * Retrieves the maximum verse number for a given Surah (chapter) in the Quran.
 *
 * @param {number} surahNumber The Surah number (1 to 114).
 * @returns {number | null} The maximum verse number in the given Surah. Returns null if the Surah number is invalid.
 */
export function getMaxVerseNumber(surahNumber: number) {
  // Quran verse counts per surah. This data is consistent across reliable sources.
  const surahVerseCounts = [
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
    111, 110, 98, 75, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54,
    45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62,
    55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28,
    20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15,
    21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 28, 2, 9, 8, 5, 19, 5, 22, 25, 19,
    20, 17, 10, 11, 12, 9, 6,
  ];

  if (surahNumber >= 1 && surahNumber <= 114) {
    return surahVerseCounts[surahNumber - 1]; // Adjust index because array is 0-based
  } else {
    console.warn("Invalid Surah number. Must be between 1 and 114.");
    return null; // Or throw an error if you prefer:  throw new Error("Invalid Surah number.");
  }
}
