import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Loader2 } from "lucide-react";
import { pipeline } from "@huggingface/transformers";
import { useToast } from "@/components/ui/use-toast";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
}

export const VoiceRecorder = ({
  onTranscriptionComplete,
}: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const whisperId = "onnx-community/whisper-tiny.en";
  // Using unknown type for the transcriber to avoid complex typing issues
  const transcribeRef = useRef<unknown>(null);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const initializeTranscriber = async () => {
      try {
        const transcriber = await pipeline(
          "automatic-speech-recognition",
          whisperId,
          {
            device: "wasm",
          }
        );
        if (isMounted) {
          // Use type assertion to assign the transcriber
          transcribeRef.current = transcriber as unknown;
        }
      } catch (error) {
        console.error("Error initializing transcriber:", error);
        toast({
          title: "Transcription Error",
          description:
            "Could not initialize the transcriber. Please try again later.",
          variant: "destructive",
        });
      }
    };

    initializeTranscriber();

    return () => {
      isMounted = false;
    };
  }, [toast]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=pcm",
        audioBitsPerSecond: 16000,
      });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
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

  const blobToAudioData = async (blob: Blob): Promise<AudioBuffer> => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext();
    return await audioContext.decodeAudioData(arrayBuffer);
  };

  const audioBufferToArray = (audioBuffer: AudioBuffer): Float32Array => {
    const channelData = audioBuffer.getChannelData(0);
    return channelData;
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
      const audioBuffer = await blobToAudioData(audioBlob);
      const audioData = audioBufferToArray(audioBuffer);

      // Define a type for a callable function
      type CallableFunction = (
        input: Float32Array,
        options: {
          sampling_rate: number;
          chunk_length_s: number;
          stride_length_s: number;
          return_timestamps: boolean;
        }
      ) => Promise<{ text: string }>;

      // Use type assertion with a more specific type
      const result = await (transcribeRef.current as CallableFunction)(
        audioData,
        {
          sampling_rate: audioBuffer.sampleRate,
          chunk_length_s: 30,
          stride_length_s: 5,
          return_timestamps: false,
        }
      );

      if (result && result.text) {
        let cleanText = result.text.trim();
        // Remove all text within square brackets regardless of content
        cleanText = cleanText.replace(/\[.*?\]/gi, "");
        // Remove all text within parentheses regardless of content
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
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Button
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

        <Textarea
          className="min-h-[120px] mt-8 resize-none font-medium"
          placeholder="Your transcription will appear here... or you can type directly"
          value={transcription}
          onChange={handleTranscriptionChange}
          disabled={isRecording || isTranscribing}
        />

        <div className="text-xs text-muted-foreground mt-2">
          {isRecording
            ? "Recording... Press the button again to stop."
            : "Press the microphone button to start recording or type directly."}
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceRecorder;
