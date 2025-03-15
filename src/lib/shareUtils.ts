
import { QuranNote, QuranVerse } from "./types";

/**
 * Creates an image from a note and verse for social media sharing
 */
export const createShareableImage = async (
  note: QuranNote,
  verse?: QuranVerse
): Promise<string> => {
  // Create a canvas element
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }
  
  // Set canvas dimensions
  canvas.width = 1080; // Instagram optimal width
  canvas.height = 1080; // Square format for social media
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#38BDF8");
  gradient.addColorStop(1, "#2563EB");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add semi-transparent overlay for better text readability
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Set up text styling
  ctx.textAlign = "center";
  const padding = 80;
  
  // Surah and verse reference
  ctx.font = "bold 40px Arial";
  ctx.fillStyle = "white";
  ctx.fillText(`Surah ${note.surah}, Verse ${note.verse}`, canvas.width / 2, padding + 40);
  
  // Add Arabic text if available
  if (verse?.text) {
    ctx.font = "bold 48px 'Kitab', Arial";
    ctx.fillStyle = "white";
    ctx.fillText(verse.text, canvas.width / 2, padding + 150);
  }
  
  // Add separator line
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 100, padding + 200);
  ctx.lineTo(canvas.width / 2 + 100, padding + 200);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Add translation if available
  if (verse?.translation) {
    // Multi-line text rendering
    wrapText(
      ctx, 
      `"${verse.translation}"`, 
      canvas.width / 2, 
      padding + 250, 
      canvas.width - 160, 
      36
    );
  }
  
  // Add user note
  const noteYPosition = verse ? padding + 450 : padding + 200;
  
  ctx.font = "italic 32px Arial";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  wrapText(
    ctx, 
    `"${note.text}"`, 
    canvas.width / 2, 
    noteYPosition, 
    canvas.width - 200, 
    40
  );
  
  // Add app reference
  ctx.font = "24px Arial";
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fillText(
    "Created with Quran Notes Keeper", 
    canvas.width / 2, 
    canvas.height - 100
  );
  ctx.fillText(
    "quran-notes-keeper.netlify.app", 
    canvas.width / 2, 
    canvas.height - 60
  );
  
  // Convert canvas to data URL
  return canvas.toDataURL("image/png");
};

/**
 * Helper function to wrap text in canvas
 */
function wrapText(
  ctx: CanvasRenderingContext2D, 
  text: string, 
  x: number, 
  y: number, 
  maxWidth: number, 
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let testLine = '';
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y + (lineCount * lineHeight));
      line = words[n] + ' ';
      lineCount++;
    } else {
      line = testLine;
    }
  }
  
  ctx.fillText(line, x, y + (lineCount * lineHeight));
}

/**
 * Share content to various social media platforms
 */
export const shareToSocialMedia = async (
  platform: "facebook" | "instagram" | "linkedin",
  imageUrl: string,
  note: QuranNote,
  verse?: QuranVerse
) => {
  // Create sharing text
  const shareText = `I created a note with Quran Notes Keeper about Surah ${note.surah}, Verse ${note.verse}. Check it out at https://quran-notes-keeper.netlify.app`;
  
  // Download image for Instagram (as it doesn't support direct sharing)
  const downloadImage = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `quran-note-s${note.surah}-v${note.verse}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Platform-specific sharing
  switch (platform) {
    case "facebook":
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
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          "https://quran-notes-keeper.netlify.app"
        )}&summary=${encodeURIComponent(shareText)}`,
        "_blank"
      );
      break;
      
    default:
      break;
  }
  
  return "shared";
};
