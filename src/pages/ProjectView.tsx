
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  doc, 
  getDoc, 
  writeBatch, 
  collection, 
  query, 
  where, 
  getDocs
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2, Trash } from "lucide-react";
import NoteForm from "@/components/NoteForm";
import NoteList from "@/components/NoteList";
import { User } from "firebase/auth";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ProjectView = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check authentication and fetch project data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (!user) {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Fetch project data
  useEffect(() => {
    if (!projectId || !currentUser) return;

    const fetchProject = async () => {
      try {
        const projectDoc = await getDoc(doc(db, "projects", projectId));
        if (projectDoc.exists()) {
          const projectData = projectDoc.data() as Omit<Project, "id">;
          
          // Make sure the user has access to this project
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
        } else {
          toast({
            title: "Project Not Found",
            description: "The project you're looking for doesn't exist",
            variant: "destructive",
          });
          navigate("/dashboard");
        }
      } catch (error: any) {
        console.error("Error fetching project:", error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId, currentUser, navigate, toast]);

  const handleNoteAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteProject = async () => {
    if (!projectId || !project) return;
    
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      
      // Delete all notes associated with this project
      const notesQuery = query(
        collection(db, "notes"),
        where("projectId", "==", projectId)
      );
      
      // Get all notes matching the query
      const notesSnapshot = await getDocs(notesQuery);
      
      // Add delete operations to batch
      notesSnapshot.docs.forEach((noteDoc) => {
        batch.delete(doc(db, "notes", noteDoc.id));
      });
      
      // Delete the project itself
      batch.delete(doc(db, "projects", projectId));
      
      // Commit the batch
      await batch.commit();
      
      toast({
        title: "Reading Pass Deleted",
        description: `"${project.name}" and all associated notes have been deleted`,
      });
      
      // Navigate to dashboard after deletion
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error deleting project:", error);
      toast({
        title: "Failed to delete reading pass",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
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
      <header className={`py-4 ${project.color || 'bg-sand-300'}`}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-4">
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
              className="bg-white/80 text-destructive hover:bg-destructive hover:text-white"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash className="h-4 w-4 mr-1" />
              Delete Pass
            </Button>
          </div>
          <h1 className="text-3xl font-serif font-bold text-primary-foreground">{project.name}</h1>
          {project.description && (
            <p className="text-primary-foreground/80 mt-1">{project.description}</p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <h2 className="text-xl font-bold mb-4">Add New Note</h2>
              <NoteForm 
                projectId={project.id} 
                userId={currentUser.uid} 
                onNoteAdded={handleNoteAdded} 
              />
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-4">Project Notes</h2>
            <Separator className="mb-6" />
            <NoteList 
              userId={currentUser.uid} 
              projectId={project.id} 
              refreshTrigger={refreshTrigger} 
            />
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="glass-card animate-fade-in">
          <DialogHeader>
            <DialogTitle>Delete Reading Pass</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{project.name}"? This will permanently remove this reading pass and ALL notes associated with it. This action cannot be undone.
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
    </div>
  );
};

export default ProjectView;
