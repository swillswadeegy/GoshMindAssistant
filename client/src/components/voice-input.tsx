import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled = false }: VoiceInputProps) {
  const { isListening, isSupported, startListening, stopListening, error } = useSpeech();

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(onTranscript);
    }
  };

  if (!isSupported) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="w-12 h-12 rounded-full"
        title="Voice input not supported"
      >
        <MicOff className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={isListening ? "destructive" : "default"}
        size="sm"
        className={`w-12 h-12 rounded-full transition-all duration-200 transform hover:scale-105 ${
          isListening 
            ? "bg-red-500 hover:bg-red-600" 
            : "bg-emerald-500 hover:bg-emerald-600 text-white"
        }`}
        onClick={handleToggleListening}
        disabled={disabled}
        title={isListening ? "Stop listening" : "Start voice input"}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </Button>
      
      {isListening && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
          <div className="bg-emerald-100 text-emerald-800 text-xs font-medium px-3 py-1 rounded-full flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>Listening...</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
          <div className="bg-red-100 text-red-800 text-xs font-medium px-3 py-1 rounded-full">
            {error}
          </div>
        </div>
      )}
    </>
  );
}
