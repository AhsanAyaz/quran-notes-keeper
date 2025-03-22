import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { QuranNote, QuranVerse } from "@/lib/types";
import { createShareableImage, shareToSocialMedia } from "@/lib/shareUtils";
import { fetchQuranVerse } from "@/lib/quranApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Share2,
  Instagram,
  Facebook,
  Linkedin,
  Download,
  Loader2,
  X,
} from "lucide-react";

interface NoteShareProps {
  note: QuranNote;
}

export const NoteShare = ({ note }: NoteShareProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareImage, setShareImage] = useState<string | null>(null);
  const [verseData, setVerseData] = useState<QuranVerse | null>(null);
  const { toast } = useToast();
  const enableSocials = import.meta.env.VITE_ENABLE_SOCIALS;

  const handleShareClick = async () => {
    setIsDialogOpen(true);
    setIsLoading(true);

    try {
      // Fetch the verse data
      const verse = await fetchQuranVerse(note.surah, note.verse);
      setVerseData(verse);

      // Generate the shareable image
      const imageUrl = await createShareableImage(note, verse);
      setShareImage(imageUrl);
    } catch (error: any) {
      console.error("Error preparing share:", error);
      toast({
        title: "Error preparing share",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (
    platform: "facebook" | "instagram" | "linkedin" | "twitter"
  ) => {
    if (!shareImage) return;

    try {
      const result = await shareToSocialMedia(
        platform,
        shareImage,
        note,
        verseData || undefined
      );

      if (result === "image_downloaded") {
        toast({
          title: "Image Downloaded",
          description:
            "The image has been downloaded. Please manually upload it to Instagram.",
        });
      } else if (result === "fallback_download") {
        toast({
          title: "Direct Sharing Not Available",
          description:
            "The image has been downloaded. Please manually upload it to your platform of choice.",
        });
      } else {
        toast({
          title: "Share Initiated",
          description: `A new window has opened to share to ${platform}.`,
        });
      }
    } catch (error: any) {
      console.error(`Error sharing to ${platform}:`, error);
      toast({
        title: `Error Sharing to ${platform}`,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!shareImage) return;

    const link = document.createElement("a");
    link.href = shareImage;
    link.download = `quran-note-s${note.surah}-v${note.verse}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Image Downloaded",
      description: "The shareable image has been downloaded.",
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs gap-1"
        onClick={handleShareClick}
      >
        <Share2 className="h-3 w-3" />
        Share Note
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card animate-fade-in max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Share Your Note</DialogTitle>
            <DialogDescription className="flex justify-between items-center gap-4">
              <span className="h-fit">
                Share this note and Quran verse to social media
              </span>
              <Button
                onClick={handleDownload}
                variant="outline"
                className="flex justify-center items-center gap-2"
              >
                <Download className="h-5 w-5 mb-1" />
                <span className="text-xs">Download</span>
              </Button>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-2  relative">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">
                  Preparing your shareable image...
                </p>
              </div>
            ) : shareImage ? (
              <>
                <div className="relative w-full max-w-sm mx-auto mb-4 shadow-lg rounded-md overflow-hidden">
                  <img
                    src={shareImage}
                    alt="Shareable note"
                    className="w-full h-auto"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-sm">
                  {enableSocials ? (
                    <>
                      <Button
                        onClick={() => handleShare("facebook")}
                        variant="outline"
                        className="flex flex-col items-center justify-center h-16"
                      >
                        <Facebook className="h-5 w-5 mb-1" />
                        <span className="text-xs">Facebook</span>
                      </Button>
                      <Button
                        onClick={() => handleShare("instagram")}
                        variant="outline"
                        className="flex flex-col items-center justify-center h-16"
                      >
                        <Instagram className="h-5 w-5 mb-1" />
                        <span className="text-xs">Instagram</span>
                      </Button>
                      <Button
                        onClick={() => handleShare("linkedin")}
                        variant="outline"
                        className="flex flex-col items-center justify-center h-16"
                      >
                        <Linkedin className="h-5 w-5 mb-1" />
                        <span className="text-xs">LinkedIn</span>
                      </Button>
                      <Button
                        onClick={() => handleShare("twitter")}
                        variant="outline"
                        className="flex flex-col items-center justify-center h-16"
                      >
                        <X className="h-5 w-5 mb-1" />
                        <span className="text-xs">X (formerly Twitter)</span>
                      </Button>
                    </>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">
                Error generating shareable image.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NoteShare;
