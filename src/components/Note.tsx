import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuranNote, QuranVerse } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import {
  Eye,
  ExternalLink,
  Trash2,
  Pencil,
  MoreVertical,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";
import { fetchQuranVerse } from "@/lib/quranApi";
import NoteForm from "./NoteForm";
import NoteShare from "./NoteShare";
import { NoteMoveToAnotherPass } from "./NoteMoveToAnotherPass";

interface NoteProps {
  note: QuranNote;
  onDelete: (id: string) => void;
  onUpdate?: () => void;
  projectId: string;
  userId: string;
}

export const Note = ({
  note,
  onDelete,
  onUpdate,
  projectId,
  userId,
}: NoteProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isVerseDialogOpen, setIsVerseDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verseData, setVerseData] = useState<QuranVerse | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "notes", note.id));
      onDelete(note.id);
      toast({
        title: "Note Deleted",
        description: "The note has been deleted successfully",
      });
    } catch (error: Error | unknown) {
      console.error("Error deleting note:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Failed to delete note",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleViewVerse = async () => {
    setIsLoading(true);
    try {
      const verse = await fetchQuranVerse(note.surah, note.verse);
      setVerseData(verse);
      setIsVerseDialogOpen(true);
    } catch (error: Error | unknown) {
      console.error("Error fetching verse:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Failed to fetch verse",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVerseDialog = (isOpen: boolean) => {
    setIsVerseDialogOpen(isOpen);
    if (!isOpen) {
      setVerseData(null);
    }
  };

  const handleEdit = () => {
    if (isMobile) {
      setIsEditDialogOpen(true);
    } else {
      setIsEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const handleNoteUpdated = () => {
    setIsEditMode(false);
    if (onUpdate) onUpdate();
  };

  if (isEditMode && !isMobile) {
    return (
      <NoteForm
        projectId={projectId}
        userId={userId}
        noteToEdit={{ ...note }} // Pass a copy of the note to prevent reference issues
        onNoteAdded={handleNoteUpdated}
        onCancelEdit={handleCancelEdit}
      />
    );
  }

  return (
    <>
      <Card
        className="glass-card animate-fade-in hover:shadow-md transition-all cursor-pointer dark:bg-background"
        onClick={handleViewVerse}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
              Surah {note.surah}:{note.verse}
            </CardTitle>
            <CardDescription>
              {note.createdAt &&
                formatDistanceToNow(note.createdAt.toDate(), {
                  addSuffix: true,
                })}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-base whitespace-pre-wrap">{note.text}</p>
        </CardContent>
        <CardFooter className="flex justify-end pt-2 flex-wrap gap-1">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                handleViewVerse();
              }}
              disabled={isLoading}
            >
              <Eye className="h-3 w-3" />
              View Verse
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              disabled={isLoading}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
            <div className="flex gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDeleteDialogOpen(true);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsShareDialogOpen(true);
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Share Note
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMoveDialogOpen(true);
                    }}
                  >
                    <ArrowRight className="h-3 w-3 mr-2" />
                    Move to Another Pass
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="glass-card animate-fade-in dark:bg-background">
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verse View Dialog */}
      <Dialog open={isVerseDialogOpen} onOpenChange={toggleVerseDialog}>
        <DialogContent className="glass-card animate-fade-in max-h-[100vh] overflow-auto dark:bg-background">
          <DialogHeader>
            <DialogTitle>
              Surah {note.surah}, Verse {note.verse}
            </DialogTitle>
            <DialogDescription>
              View the Quran verse related to this note
            </DialogDescription>
          </DialogHeader>

          {verseData ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <h3 className="font-semibold">Arabic Text</h3>
                <p className="text-right font-kitab text-2xl leading-relaxed p-3 bg-accent/50 rounded-md">
                  {verseData.text}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Translation</h3>
                <p className="text-muted-foreground p-3 bg-secondary/50 rounded-md">
                  {verseData.translation}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Loading verse data...</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="gap-1"
              onClick={() =>
                window.open(
                  `https://quran.com/${note.surah}/${note.verse}`,
                  "_blank"
                )
              }
            >
              <ExternalLink className="h-4 w-4" />
              Open on Quran.com
            </Button>
            <Button onClick={() => toggleVerseDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="glass-card animate-fade-in">
          <DialogHeader>
            <DialogTitle>Share Note</DialogTitle>
            <DialogDescription>Share this note with others</DialogDescription>
          </DialogHeader>
          <NoteShare
            note={note}
            open={isShareDialogOpen}
            onOpenChange={setIsShareDialogOpen}
          />
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent className="glass-card animate-fade-in">
          <DialogHeader>
            <DialogTitle>Move Note</DialogTitle>
            <DialogDescription>
              Move this note to another pass
            </DialogDescription>
          </DialogHeader>
          <NoteMoveToAnotherPass
            note={note}
            userId={userId}
            open={isMoveDialogOpen}
            onOpenChange={setIsMoveDialogOpen}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog for Mobile */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-card animate-fade-in">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>
              Edit your note for Surah {note.surah}:{note.verse}
            </DialogDescription>
          </DialogHeader>
          {isEditDialogOpen && (
            <NoteForm
              projectId={projectId}
              userId={userId}
              noteToEdit={{ ...note }}
              onNoteAdded={() => {
                handleNoteUpdated();
                setIsEditDialogOpen(false);
              }}
              onCancelEdit={() => {
                handleCancelEdit();
                setIsEditDialogOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Note;
