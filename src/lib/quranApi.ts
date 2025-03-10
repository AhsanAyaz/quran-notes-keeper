import { QuranVerse, QuranSurah } from "./types";

const API_BASE_URL = "https://api.alquran.cloud/v1";

// Fetch a specific verse from the Quran
export const fetchQuranVerse = async (
  surahNumber: number,
  verseNumber: number
): Promise<QuranVerse> => {
  try {
    // Get the Arabic text
    const arabicResponse = await fetch(
      `${API_BASE_URL}/ayah/${surahNumber}:${verseNumber}`
    );
    if (!arabicResponse.ok) {
      throw new Error(`Failed to fetch verse: ${arabicResponse.statusText}`);
    }
    const arabicData = await arabicResponse.json();

    // Get the English translation
    const translationResponse = await fetch(
      `${API_BASE_URL}/ayah/${surahNumber}:${verseNumber}/en.maududi`
    );
    if (!translationResponse.ok) {
      throw new Error(
        `Failed to fetch translation: ${translationResponse.statusText}`
      );
    }
    const translationData = await translationResponse.json();

    return {
      verse: arabicData.data.numberInSurah,
      text: arabicData.data.text,
      translation: translationData.data.text,
      surah: arabicData.data.surah.number,
    };
  } catch (error) {
    console.error("Error fetching Quran verse:", error);
    throw error;
  }
};

// Fetch details about a specific surah
export const fetchSurahInfo = async (
  surahNumber: number
): Promise<QuranSurah> => {
  try {
    const response = await fetch(`${API_BASE_URL}/surah/${surahNumber}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch surah: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching surah info:", error);
    throw error;
  }
};

// Fetch all surahs (chapters) of the Quran
export const fetchAllSurahs = async (): Promise<QuranSurah[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/surah`);
    if (!response.ok) {
      throw new Error(`Failed to fetch surahs: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching all surahs:", error);
    throw error;
  }
};
