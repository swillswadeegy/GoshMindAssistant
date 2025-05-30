import { Button } from "@/components/ui/button";
import { Volume2, Bot } from "lucide-react";
import type { Message } from "@shared/schema";

interface ChatMessageProps {
  message: Message;
  onSpeak?: (text: string) => void;
}

export function ChatMessage({ message, onSpeak }: ChatMessageProps) {
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-xs lg:max-w-md bg-primary text-white rounded-2xl rounded-br-md px-4 py-3">
          <p className="text-sm leading-relaxed">{message.content}</p>
          <span className="text-xs opacity-75 mt-1 block">{timestamp}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-slate-600" />
        </div>
        <div className="max-w-xs lg:max-w-md bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
          <p className="text-sm text-slate-800 leading-relaxed">{message.content}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-500">{timestamp}</span>
            {onSpeak && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-slate-500 hover:text-slate-800"
                onClick={() => onSpeak(message.content)}
                title="Read aloud"
              >
                <Volume2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}