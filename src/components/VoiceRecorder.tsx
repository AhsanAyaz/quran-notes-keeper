import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Loader2 } from "lucide-react";
import {
  pipeline,
  AutomaticSpeechRecognitionPipeline,
} from "@huggingface/transformers";
import { useToast } from "@/components/ui/use-toast";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onTranscriberStatus?: (isReady: boolean) => void;
}

export const VoiceRecorder = ({
  onTranscriptionComplete,
  onTranscriberStatus,
}: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionEnabled, setTranscriptionEnabled] = useState<
    boolean | null
  >(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const whisperId = "onnx-community/whisper-tiny.en";

  const transcribeRef = useRef<AutomaticSpeechRecognitionPipeline | null>(null);
  const { toast } = useToast();
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeTranscriber = async () => {
      try {
        if (isMounted) {
          // Check if we're on iOS
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

          // Try initializing with appropriate settings
          const pipe = await pipeline(
            "automatic-speech-recognition",
            whisperId,
            {
              device: "wasm",
              // Don't use quantized on iOS as it might not be supported well
              ...(isIOS ? {} : { quantized: true }),
            }
          );

          transcribeRef.current = pipe;
          onTranscriberStatus?.(true);
          setTranscriptionEnabled(true);
          console.log("Transcriber initialized successfully");
        }
      } catch (error) {
        console.error("Error initializing transcriber:", error);

        // Try fallback mode for iOS
        try {
          if (isMounted && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
            console.log("Trying fallback initialization for iOS...");
            const pipe = await pipeline(
              "automatic-speech-recognition",
              whisperId,
              {
                device: "wasm",
                // No additional options for iOS fallback
              }
            );
            transcribeRef.current = pipe;
            onTranscriberStatus?.(true);
            setTranscriptionEnabled(true);
            setIsFallbackMode(true);
            console.log("Transcriber initialized in fallback mode");
          } else {
            onTranscriberStatus?.(false);
            setTranscriptionEnabled(false);
          }
        } catch (fallbackError) {
          console.error("Fallback initialization also failed:", fallbackError);
          onTranscriberStatus?.(false);
          setTranscriptionEnabled(false);

          // Only show error if we haven't shown it before on this device
          if (!localStorage.getItem("transcriberErrorShown")) {
            toast({
              title: "Transcription Error",
              description:
                "Could not initialize the transcriber. Manual note entry is still available.",
              variant: "destructive",
            });
            localStorage.setItem("transcriberErrorShown", "true");
          }
        }
      }
    };

    initializeTranscriber();

    return () => {
      isMounted = false;
    };
  }, [toast, onTranscriberStatus]);

  const startRecording = async () => {
    try {
      // Clear any previous transcription
      setTranscription("");

      // iOS-optimized audio constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      console.log("Requesting audio stream with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Stream obtained:", stream);

      // Find the best supported MIME type for this browser
      let mimeType = "";
      const types = [
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/webm;codecs=opus",
      ];

      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log(`Selected MIME type: ${mimeType}`);
          break;
        }
      }

      // If no supported types are found, try without specifying mime type
      const options = mimeType ? { mimeType } : {};
      console.log("Creating MediaRecorder with options:", options);

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          console.log(`Received data chunk: ${e.data.size} bytes`);
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log("MediaRecorder stopped, processing audio...");
        // Get all recorded chunks
        const chunks = chunksRef.current;

        if (chunks.length === 0) {
          console.error("No audio data collected");
          toast({
            title: "Recording Error",
            description: "No audio data was captured. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Create blob from all chunks
        const audioBlob = new Blob(chunks, { type: mimeType || "audio/webm" });
        console.log(`Created audio blob: ${audioBlob.size} bytes`);

        if (audioBlob.size < 100) {
          console.error("Audio blob too small, likely no audio captured");
          toast({
            title: "Recording Error",
            description:
              "Recording was too quiet or too short. Please try again.",
            variant: "destructive",
          });
          return;
        }

        await transcribeAudio(audioBlob);
      };

      console.log("Starting MediaRecorder...");
      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      console.log("Recording started successfully");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Error",
        description:
          "Could not access microphone. Please check permissions and ensure you're using a supported browser.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log("Stopping recording...");

      // Sometimes stop() can throw an error if the recorder is in an invalid state
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Error stopping MediaRecorder:", e);
      }

      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop all tracks in the stream
      try {
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach((track) => {
            console.log(`Stopping track: ${track.kind}`);
            track.stop();
          });
        }
      } catch (e) {
        console.error("Error stopping tracks:", e);
      }

      console.log("Recording stopped");
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    if (!transcribeRef.current) {
      toast({
        title: "Transcription Error",
        description:
          "Transcriber not initialized. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsTranscribing(true);
    console.log("Starting transcription...");

    try {
      // Create a URL for the audio blob
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log("Created audio URL:", audioUrl);

      // Special handling for iOS fallback mode if needed
      let result;
      if (isFallbackMode) {
        console.log("Using fallback transcription mode");
        // In fallback mode, we might need different processing
        result = await transcribeRef.current(audioUrl);
      } else {
        // Standard processing
        result = await transcribeRef.current(audioUrl);
      }

      console.log("Transcription result:", result);

      const text = Array.isArray(result) ? result[0]?.text : result?.text;

      if (text) {
        console.log("Raw transcription:", text);
        let cleanText = text.trim();

        // Remove all text within square brackets like [SOUND], [MUSIC], etc.
        cleanText = cleanText.replace(/\[.*?\]/gi, "");

        // Remove all text within parentheses
        cleanText = cleanText.replace(/\(.*?\)/gi, "");

        // Clean up extra whitespace
        cleanText = cleanText.replace(/\s+/g, " ").trim();

        console.log("Cleaned transcription:", cleanText);

        if (cleanText.length > 0) {
          setTranscription(cleanText);
          onTranscriptionComplete(cleanText);
          toast({
            title: "Transcription Complete",
            description: "Your voice note has been transcribed successfully.",
          });
        } else {
          toast({
            title: "No Speech Detected",
            description:
              "The recording contained only background sounds. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Transcription Error",
          description: "No speech detected. Please try again.",
          variant: "destructive",
        });
      }

      // Clean up the audio URL
      URL.revokeObjectURL(audioUrl);
    } catch (error: unknown) {
      console.error("Transcription error:", error);
      toast({
        title: "Transcription Failed",
        description:
          "Could not transcribe audio. You can still type your note manually.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
      console.log("Transcription process complete");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleTranscriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setTranscription(e.target.value);
    onTranscriptionComplete(e.target.value);
  };

  return (
    <Card className="w-full animate-fade-in glass-card">
      <CardContent className="p-6 space-y-4">
        {transcriptionEnabled ? (
          <div className="flex flex-col items-center gap-4 mb-8 ">
            <div className="relative">
              <Button
                type="button"
                className={`h-16 w-16 rounded-full ${
                  isRecording
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-primary text-primary-foreground"
                } ${isRecording ? "recording-wave" : ""}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
              >
                {isRecording ? (
                  <Square className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>
              {isRecording && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm font-medium">
                  {formatTime(recordingTime)}
                </div>
              )}
            </div>

            {isTranscribing && (
              <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Transcribing...</span>
              </div>
            )}
          </div>
        ) : transcriptionEnabled === null ? (
          <div className="text-center mb-8 ">
            <Loader2 className="h-4 w-4 animate-spin mx-auto max-w-fit" />
            <p className="text-sm text-muted-foreground mt-2">
              Initializing speech transcription...
            </p>
          </div>
        ) : (
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground">
              Speech transcription not available. Please type your notes
              directly.
            </p>
          </div>
        )}

        <Textarea
          className="min-h-[120px] resize-none font-medium"
          placeholder={
            transcriptionEnabled
              ? `Your transcription will appear here... or you can type directly`
              : `Type your notes here...`
          }
          value={transcription}
          onChange={handleTranscriptionChange}
          disabled={isRecording || isTranscribing}
        />

        {transcriptionEnabled ? (
          <div className="text-xs text-muted-foreground mt-2">
            {isRecording
              ? "Recording... Press the button again to stop."
              : "Press the microphone button to start recording or type directly."}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mt-2">
            Type your notes directly in the box above.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceRecorder;
