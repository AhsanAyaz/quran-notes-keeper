import { useState } from "react";
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
import { Eye, ExternalLink, Trash2, Pencil, MoreVertical } from "lucide-react";
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
  const { toast } = useToast();

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
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const handleNoteUpdated = () => {
    setIsEditMode(false);
    if (onUpdate) onUpdate();
  };

  if (isEditMode) {
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
      <Card className="glass-card animate-fade-in hover:shadow-md transition-all">
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
              onClick={handleEdit}
              disabled={isLoading}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive gap-1"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isLoading}
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
            <div className="flex gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={handleViewVerse}
                      disabled={isLoading}
                    >
                      <Eye className="h-3 w-3" />
                      View Verse
                    </Button>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <div>
                      <NoteShare note={note} />
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <div>
                      <NoteMoveToAnotherPass note={note} userId={userId} />
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="glass-card animate-fade-in">
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
        <DialogContent className="glass-card animate-fade-in max-h-[100vh] overflow-auto">
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
    </>
  );
};

export default Note;
