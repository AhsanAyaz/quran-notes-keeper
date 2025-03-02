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
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const whisperId = "onnx-community/whisper-tiny.en";
  const transcribeRef = useRef<AutomaticSpeechRecognitionPipeline | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const initializeTranscriber = async () => {
      try {
        if (isMounted) {
          const pipe = await pipeline(
            "automatic-speech-recognition",
            whisperId,
            {
              device: "wasm",
            }
          );
          transcribeRef.current = pipe;
          onTranscriberStatus?.(true);
          setTranscriptionEnabled(true);
        }
      } catch (error) {
        console.error("Error initializing transcriber:", error);
        onTranscriberStatus?.(false);
        setTranscriptionEnabled(false);
        // Only show error if we haven't shown it before on this device
        if (!localStorage.getItem("transcriberErrorShown")) {
          toast({
            title: "Transcription Error",
            description:
              "Could not initialize the transcriber. Please try again later.",
            variant: "destructive",
          });
          localStorage.setItem("transcriberErrorShown", "true");
        }
      }
    };

    initializeTranscriber();

    return () => {
      isMounted = false;
    };
  }, [toast]);

  const startRecording = async () => {
    try {
      // iOS requires specific audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
        },
      });

      // iOS requires user interaction before creating AudioContext
      if (!audioContextRef.current) {
        // Safari/WebKit support
        const AudioContextClass =
          window.AudioContext ||
          (window["webkitAudioContext"] as { new (): AudioContext });
        audioContextRef.current = new AudioContextClass();
      }
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Configure MediaRecorder with iOS-compatible settings
      let options = {};

      // Try different formats in order of preference
      const mimeTypes = [
        "audio/mp4",
        "audio/mp4a-latm",
        "audio/webm",
        "audio/ogg",
        "audio/wav",
      ];

      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          options = {
            mimeType,
            audioBitsPerSecond: 128000,
          };
          break;
        }
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        // Use the mime type that was actually selected
        const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        await transcribeAudio(audioBlob);
      };

      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
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
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
        analyserRef.current = null;
      }
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

    try {
      // Create a URL for the audio blob
      const audioUrl = URL.createObjectURL(audioBlob);

      // Transcribe using the URL directly
      const result = await transcribeRef.current(audioUrl);
      const text = Array.isArray(result) ? result[0]?.text : result?.text;

      if (text) {
        let cleanText = text.trim();

        // Remove all text within square brackets like [SOUND], [MUSIC], etc.
        cleanText = cleanText.replace(/\[.*?\]/gi, "");

        // Remove all text within parentheses
        cleanText = cleanText.replace(/\(.*?\)/gi, "");

        // Clean up extra whitespace
        cleanText = cleanText.replace(/\s+/g, " ").trim();

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
    } catch (error: unknown) {
      console.error("Transcription error:", error);
      toast({
        title: "Transcription Failed",
        description: "Could not transcribe audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
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
          </div>
        ) : null}

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

        {transcriptionEnabled && (
          <div className="text-xs text-muted-foreground mt-2">
            {isRecording
              ? "Recording... Press the button again to stop."
              : "Press the microphone button to start recording or type directly."}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceRecorder;
