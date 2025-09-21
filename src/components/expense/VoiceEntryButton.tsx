"use client";

import { Button } from "@/components/ui/button";
import type { UICategory } from "@/features/categories/useCategoriesQuery";
import { parseSpeechExpense } from "@/lib/nlp/speechExpense";
import { Mic, Square } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Props = {
  categories: UICategory[];
  onParsed: (res: {
    sentence: string;
    amount?: number;
    categoryId?: string;
    subcategoryId?: string;
  }) => void;
  onPreviewChange?: (text: string) => void;
  className?: string;
  // Optional UI variant flag retained for backward compatibility; currently unused
  variant?: "icon" | "default";
};

export default function VoiceEntryButton({
  categories,
  onParsed,
  onPreviewChange,
  className,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [preview, setPreview] = useState("");
  const lastCommittedRef = useRef<string>("");
  const transcriptRef = useRef<string>("");

  const SpeechRecognitionImpl = useMemo(() => {
    const w = typeof window !== "undefined" ? (window as any) : undefined;
    return w?.SpeechRecognition || w?.webkitSpeechRecognition || null;
  }, []);

  useEffect(() => {
    setSupported(!!SpeechRecognitionImpl);
  }, [SpeechRecognitionImpl]);

  useEffect(() => {
    onPreviewChange?.(preview);
  }, [preview, onPreviewChange]);

  const start = () => {
    if (!SpeechRecognitionImpl) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }
    try {
      const rec: SpeechRecognition = new SpeechRecognitionImpl();
      recognitionRef.current = rec;
      lastCommittedRef.current = "";
      transcriptRef.current = "";
      rec.lang = "en-US";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = res[0]?.transcript ?? "";
          if (res.isFinal) finalText += transcript;
          else interim += transcript;
        }
        const text = finalText || interim || "";
        transcriptRef.current = text;
        setPreview(text);
      };
      rec.onerror = (e) => {
        console.error("Speech error", e);
        toast.error("Speech recognition error");
        stop();
      };
      rec.onend = () => {
        setRecording(false);
        const s = transcriptRef.current.trim();
        if (s && lastCommittedRef.current !== s) {
          commit(s);
        }
      };
      rec.start();
      setRecording(true);
    } catch (e) {
      console.error(e);
      toast.error("Could not start speech recognition");
    }
  };

  const stop = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
    const s = transcriptRef.current.trim();
    if (s && lastCommittedRef.current !== s) {
      setTimeout(() => {
        if (lastCommittedRef.current !== s) commit(s);
      }, 0);
    }
  };

  const commit = (textOverride?: string) => {
    const sentence = (textOverride ?? transcriptRef.current ?? preview).trim();
    if (!sentence) {
      toast.message("No speech captured yet");
      return;
    }
    if (lastCommittedRef.current === sentence) return;
    lastCommittedRef.current = sentence;
    const parsed = parseSpeechExpense(sentence, categories);
    onParsed({
      sentence,
      amount: parsed.amount,
      categoryId: parsed.categoryId,
      subcategoryId: parsed.subcategoryId,
    });
    setPreview("");
  };

  return (
    <div className={className}>
      <div className="relative inline-flex items-center">
        <Button
          type="button"
          size="icon"
          variant={recording ? "destructive" : "outline"}
          onClick={recording ? stop : start}
          disabled={!supported}
          aria-label={recording ? "Stop voice input" : "Start voice input"}
          title={recording ? "Stop voice input" : "Start voice input"}
        >
          {recording ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        {recording && preview && (
          <div className="absolute top-full right-0 z-20 mt-2 pointer-events-none">
            <div className="relative min-w-56 max-w-[80vw] max-h-48 overflow-auto rounded-lg border bg-background px-3 py-2 text-sm text-foreground shadow-md ring-1 ring-border break-words">
              {/* caret */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-1 right-4 h-2 w-2 rotate-45 bg-background border-l border-t border-border"
              />
              {preview}
            </div>
          </div>
        )}
        <span className="sr-only" aria-live="polite">
          {recording && preview ? `Preview ${preview}` : ""}
        </span>
      </div>
    </div>
  );
}
