/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Send, Paperclip, X, FileText, Loader2, Mic, MicOff } from 'lucide-react';
import { cn } from '../../lib/utils';

import { Message, ConfusionType, Language } from '../../types';

// Add type definition for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface InputAreaProps {
  onSendMessage: (text: string, file?: File) => void;
  disabled?: boolean;
  language?: Language;
}

export const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, disabled, language = 'en-US' }) => {
  const [text, setText] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = React.useState(false);
  const [isListening, setIsListening] = React.useState(false);
  const recognitionRef = React.useRef<SpeechRecognition | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      // Map language codes to speech recognition locale
      const langMap: Record<Language, string> = {
        'en-US': 'en-US',
        'hi-IN': 'hi-IN',
        'kn-IN': 'kn-IN'
      };
      recognitionRef.current.lang = langMap[language] || 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setText(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((text.trim() || file) && !disabled) {
      onSendMessage(text, file || undefined);
      setText('');
      setFile(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
    }
  };

  return (
    <div className="p-6 bg-white border-t border-gray-100">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex flex-col gap-4">
        {file && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md w-fit">
            <FileText size={16} className="text-edu-primary" />
            <span className="text-[12px] font-medium text-gray-700 truncate max-w-[200px]">{file.name}</span>
            <button 
              type="button" 
              onClick={() => setFile(null)}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X size={14} className="text-gray-400" />
            </button>
          </div>
        )}
        
        <div className="flex flex-col gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask your question here..."
            className="edu-input min-h-[80px] resize-none p-4 text-sm"
            disabled={disabled}
          />
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-edu-primary transition-colors"
                disabled={disabled}
              >
                <Paperclip size={16} />
                <span>Attach PDF</span>
              </button>

              <button
                type="button"
                onClick={toggleListening}
                className={cn(
                  "flex items-center gap-2 text-xs font-bold transition-colors",
                  isListening ? "text-edu-primary animate-pulse" : "text-gray-400 hover:text-edu-primary"
                )}
                disabled={disabled}
                title={isListening ? "Stop Listening" : "Start Listening"}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                <span>{isListening ? "Listening..." : "Voice"}</span>
              </button>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".pdf" 
              className="hidden" 
            />

            <button
              type="submit"
              disabled={(!text.trim() && !file) || disabled}
              className="edu-button flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {disabled ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>PROCESSING...</span>
                </>
              ) : (
                "Ask Question"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
