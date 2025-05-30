import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Project, QuranNote } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import TranslationSelector from "@/components/TranslationSelector";
import {
  ArrowLeft,
  Loader2,
  Trash,
  Pencil,
  FileText,
  Plus,
} from "lucide-react";
import NoteForm from "@/components/NoteForm";
import NoteList from "@/components/NoteList";
import { User } from "firebase/auth";
import { Separator } from "@/components/ui/separator";
import { exportNotesToPDF } from "@/lib/pdfExport";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const ProjectView = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [selectedNote, setSelectedNote] = useState<QuranNote | null>(null);
  const [projectNotes, setProjectNotes] = useState<QuranNote[]>([]);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (!user) {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!projectId || !currentUser) return;

    const fetchProject = async () => {
      try {
        const projectDoc = await getDoc(doc(db, "projects", projectId));
        if (projectDoc.exists()) {
          const projectData = projectDoc.data() as Omit<Project, "id">;

          if (projectData.userId !== currentUser.uid) {
            toast({
              title: "Access Denied",
              description: "You don't have permission to view this project",
              variant: "destructive",
            });
            navigate("/dashboard");
            return;
          }

          setProject({ id: projectId, ...projectData } as Project);
          setEditName(projectData.name);
          setEditDescription(projectData.description || "");
        } else {
          toast({
            title: "Project Not Found",
            description: "The project you're looking for doesn't exist",
            variant: "destructive",
          });
          navigate("/dashboard");
        }
      } catch (error: Error | unknown) {
        console.error("Error fetching project:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId, currentUser, navigate, toast, refreshTrigger]);

  const handleNoteAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDeleteProject = async () => {
    if (!projectId || !project) return;

    setIsDeleting(true);
    try {
      const batch = writeBatch(db);

      const notesQuery = query(
        collection(db, "notes"),
        where("projectId", "==", projectId)
      );

      const notesSnapshot = await getDocs(notesQuery);

      notesSnapshot.docs.forEach((noteDoc) => {
        batch.delete(doc(db, "notes", noteDoc.id));
      });

      batch.delete(doc(db, "projects", projectId));

      await batch.commit();

      toast({
        title: "Reading Pass Deleted",
        description: `"${project.name}" and all associated notes have been deleted`,
      });

      navigate("/dashboard");
    } catch (error: Error | unknown) {
      console.error("Error deleting project:", error);
      toast({
        title: "Failed to delete reading pass",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleEditProject = async () => {
    if (!projectId || !project) return;

    if (!editName.trim()) {
      toast({
        title: "Name Required",
        description: "Please provide a name for your reading pass",
        variant: "destructive",
      });
      return;
    }

    setIsEditing(true);
    try {
      await updateDoc(doc(db, "projects", projectId), {
        name: editName.trim(),
        description: editDescription.trim(),
      });

      toast({
        title: "Reading Pass Updated",
        description: "Your reading pass has been updated successfully",
      });

      setRefreshTrigger((prev) => prev + 1);
      setIsEditDialogOpen(false);
    } catch (error: Error | unknown) {
      console.error("Error updating project:", error);
      toast({
        title: "Failed to update reading pass",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!projectId || !project) return;

    setIsExportingPDF(true);
    try {
      // Fetch all notes for this project if not already loaded
      if (projectNotes.length === 0) {
        const notesQuery = query(
          collection(db, "notes"),
          where("projectId", "==", projectId)
        );
        const notesSnapshot = await getDocs(notesQuery);
        const notesList = notesSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as QuranNote)
        );
        setProjectNotes(notesList);
        exportNotesToPDF(notesList, project.name);
      } else {
        exportNotesToPDF(projectNotes, project.name);
      }

      toast({
        title: "PDF Exported",
        description: "Your notes have been exported to PDF",
      });
    } catch (error: Error | unknown) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleNotesLoaded = (notes: QuranNote[]) => {
    setProjectNotes(notes);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project || !currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className={`py-4 ${project.color || "bg-primary/20"}`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-4">
            <div className="flex gap-2 justify-between items-center w-full">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/80"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/80"
                onClick={handleExportPDF}
                disabled={isExportingPDF}
              >
                {isExportingPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-1" />
                    Export PDF
                  </>
                )}
              </Button>
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-primary-foreground">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-primary-foreground/80 mt-1">
              {project.description}
            </p>
          )}
        </div>
        <div className="px-4 flex gap-2 justify-between items-center w-full my-2">
          <TranslationSelector />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/80"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/80 text-destructive hover:bg-destructive hover:text-white"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {!isMobile && (
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <h2 className="text-xl font-bold mb-4">Add New Note</h2>
                <NoteForm
                  projectId={project.id}
                  userId={currentUser.uid}
                  onNoteAdded={handleNoteAdded}
                  noteToEdit={selectedNote}
                  onCancelEdit={() => setSelectedNote(null)}
                />
              </div>
            </div>
          )}

          <div className={isMobile ? "col-span-1" : "lg:col-span-2"}>
            <h2 className="text-xl font-bold mb-4">Project Notes</h2>
            <Separator className="mb-6" />
            <NoteList
              userId={currentUser.uid}
              projectId={project.id}
              refreshTrigger={refreshTrigger}
              onNotesLoaded={handleNotesLoaded}
            />
          </div>
        </div>
      </main>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="glass-card animate-fade-in">
          <DialogHeader>
            <DialogTitle>Delete Reading Pass</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{project.name}"? This will
              permanently remove this reading pass and ALL notes associated with
              it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Reading Pass"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-card animate-fade-in">
          <DialogHeader>
            <DialogTitle>Edit Reading Pass</DialogTitle>
            <DialogDescription>
              Update the details of your reading pass
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter reading pass name"
                disabled={isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">
                Description (optional)
              </Label>
              <Textarea
                id="project-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter a brief description"
                className="resize-none"
                disabled={isEditing}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button onClick={handleEditProject} disabled={isEditing}>
              {isEditing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Form Dialog for Mobile */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="glass-card animate-fade-in max-h-[100dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Note</DialogTitle>
            <DialogDescription>
              Add a new note to your reading pass
            </DialogDescription>
          </DialogHeader>
          <NoteForm
            projectId={project.id}
            userId={currentUser.uid}
            onNoteAdded={() => {
              handleNoteAdded();
              setIsFormDialogOpen(false);
            }}
            noteToEdit={selectedNote}
            onCancelEdit={() => {
              setSelectedNote(null);
              setIsFormDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Floating Action Button for Mobile */}
      {isMobile && (
        <Button
          className="fixed bottom-4 right-4 rounded-full w-14 h-14 aspect-square p-0 shadow-lg"
          size="lg"
          onClick={() => setIsFormDialogOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};

export default ProjectView;
