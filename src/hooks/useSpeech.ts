import { useState, useEffect, useRef } from "react";

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop speaking when component unmounts
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;

    // If currently speaking, cancel first
    window.speechSynthesis.cancel();

    // Clean markdown symbols to make speech sound natural
    const cleanText = text
      .replace(/[\*\#\_`~\[\]]/g, "") // Remove Markdown characters
      .replace(/https?:\/\/\S+/g, "ลิงก์"); // Replace URL strings

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;

    // Detect language: if has Thai characters, use th-TH, otherwise en-US or let browser choose
    const hasThai = /[ก-๙]/.test(text);
    if (hasThai) {
      utterance.lang = "th-TH";
    } else {
      utterance.lang = "en-US";
    }

    // Try to find a high-quality voice for the selected language
    if (window.speechSynthesis.getVoices) {
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (voice) => voice.lang.includes(hasThai ? "th" : "en")
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error("SpeechSynthesisUtterance error:", event);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeech = (text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  return {
    isSpeaking,
    speak,
    stop,
    toggleSpeech,
    hasSpeechSupport: typeof window !== "undefined" && "speechSynthesis" in window,
  };
}
