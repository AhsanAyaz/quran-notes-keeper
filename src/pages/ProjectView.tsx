
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import NoteForm from "@/components/NoteForm";
import NoteList from "@/components/NoteList";
import { User } from "firebase/auth";
import { Separator } from "@/components/ui/separator";

const ProjectView = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
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
          <Button 
            variant="outline" 
            size="sm" 
            className="mb-4 bg-white/80"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
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
    </div>
  );
};

export default ProjectView;
