import { QuranNote, QuranVerse } from "./types";
import html2canvas from "html2canvas";

/**
 * Creates an image from a note and verse for social media sharing
 * using HTML elements instead of canvas directly
 */
export const createShareableImage = async (
  note: QuranNote,
  verse?: QuranVerse
): Promise<string> => {
  // Create a container element
  const container = document.createElement("div");
  container.style.width = "1080px";
  container.style.height = "auto";
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.background = "linear-gradient(to bottom, #38BDF8, #2563EB)";
  container.style.padding = "80px";
  container.style.color = "white";
  container.style.fontFamily = "Arial, sans-serif";
  container.style.boxSizing = "border-box";
  container.style.borderRadius = "12px";
  container.style.overflow = "hidden";

  // Add semi-transparent overlay for better text readability
  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
  overlay.style.zIndex = "1";
  container.appendChild(overlay);

  // Create content wrapper with higher z-index
  const content = document.createElement("div");
  content.style.position = "relative";
  content.style.zIndex = "2";
  content.style.display = "flex";
  content.style.flexDirection = "column";
  content.style.gap = "30px";
  content.style.textAlign = "center";

  // Surah and verse reference
  const reference = document.createElement("h2");
  reference.style.fontSize = "40px";
  reference.style.fontWeight = "bold";
  reference.style.margin = "0";
  reference.textContent = `Surah ${note.surah}, Verse ${note.verse}`;
  content.appendChild(reference);

  // Add Arabic text if available
  if (verse?.text) {
    const arabicText = document.createElement("p");
    arabicText.style.fontSize = "48px";
    arabicText.style.fontFamily = "Kitab, Arial";
    arabicText.style.direction = "rtl";
    arabicText.style.margin = "20px 0";
    arabicText.style.lineHeight = "1.5";
    arabicText.style.padding = "30px 20px";
    arabicText.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    arabicText.style.borderRadius = "8px";
    arabicText.textContent = verse.text;
    content.appendChild(arabicText);
  }

  // Add separator line
  const separator = document.createElement("hr");
  separator.style.width = "200px";
  separator.style.margin = "10px auto";
  separator.style.border = "none";
  separator.style.borderTop = "2px solid rgba(255, 255, 255, 0.7)";
  content.appendChild(separator);

  // Add translation if available
  if (verse?.translation) {
    const translation = document.createElement("blockquote");
    translation.style.fontSize = "36px";
    translation.style.fontStyle = "italic";
    translation.style.margin = "20px 0";
    translation.style.lineHeight = "1.4";
    translation.style.padding = "20px";
    translation.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    translation.style.borderRadius = "8px";
    translation.style.borderLeft = "4px solid white";
    translation.textContent = `"${verse.translation}"`;
    content.appendChild(translation);
  }

  // Add user note
  const noteElement = document.createElement("div");
  noteElement.style.fontSize = "32px";
  noteElement.style.fontStyle = "italic";
  noteElement.style.margin = "20px 0";
  noteElement.style.lineHeight = "1.4";
  noteElement.style.padding = "30px";
  noteElement.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
  noteElement.style.borderRadius = "8px";
  noteElement.textContent = `Note:\n"${note.text}"`;
  content.appendChild(noteElement);

  // Add app reference
  const appReference = document.createElement("div");
  appReference.style.fontSize = "24px";
  appReference.style.marginTop = "40px";
  appReference.style.opacity = "0.8";

  const appName = document.createElement("p");
  appName.style.margin = "5px 0";
  appName.textContent = "Created with Quran Notes Keeper";

  const appUrl = document.createElement("p");
  appUrl.style.margin = "5px 0";
  appUrl.textContent = "quran-notes-keeper.netlify.app";

  appReference.appendChild(appName);
  appReference.appendChild(appUrl);
  content.appendChild(appReference);

  // Append content to container
  container.appendChild(content);

  // Append container to body temporarily
  document.body.appendChild(container);

  try {
    // Use html2canvas to convert HTML to image
    const canvas = await html2canvas(container, {
      allowTaint: true,
      useCORS: true,
      scale: 1,
      backgroundColor: null,
    });

    // Convert canvas to data URL
    return canvas.toDataURL("image/png");
  } finally {
    // Clean up - remove the container
    document.body.removeChild(container);
  }
};

/**
 * Share content to various social media platforms
 */
export const shareToSocialMedia = async (
  platform: "facebook" | "instagram" | "linkedin" | "twitter",
  imageUrl: string,
  note: QuranNote,
  verse?: QuranVerse
) => {
  // Create sharing text
  const shareText = `I created a note with Quran Notes Keeper about Surah ${note.surah}, Verse ${note.verse}. Check it out at https://quran-notes-keeper.netlify.app`;

  // Download image for Instagram and for fallback
  const downloadImage = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `quran-note-s${note.surah}-v${note.verse}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Create a blob from the image URL for proper sharing
  const getImageBlob = async (): Promise<Blob> => {
    const response = await fetch(imageUrl);
    return await response.blob();
  };

  // Platform-specific sharing
  try {
    switch (platform) {
      case "facebook":
        // Facebook requires Open Graph meta tags for proper image sharing
        // But we can still share the URL with text
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            "https://quran-notes-keeper.netlify.app"
          )}&quote=${encodeURIComponent(shareText)}`,
          "_blank"
        );
        break;

      case "instagram":
        // Instagram doesn't support direct sharing via web API
        // Download the image and prompt the user
        downloadImage();
        return "image_downloaded";

      case "linkedin":
        // LinkedIn sharing
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
            "https://quran-notes-keeper.netlify.app"
          )}`,
          "_blank"
        );
        break;

      case "twitter":
        // Twitter (X) sharing
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            shareText
          )}&url=${encodeURIComponent(
            "https://quran-notes-keeper.netlify.app"
          )}`,
          "_blank"
        );
        break;

      default:
        break;
    }

    return "shared";
  } catch (error) {
    console.error("Error sharing:", error);
    // Fallback to downloading the image
    downloadImage();
    return "fallback_download";
  }
};

/**
 * Helper function to wrap text in canvas
 * (kept for backward compatibility)
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let testLine = "";
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y + lineCount * lineHeight);
      line = words[n] + " ";
      lineCount++;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line, x, y + lineCount * lineHeight);
}
