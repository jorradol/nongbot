import { useState, useCallback } from "react";
import { appendBranding, logCopyEvent } from "../utils/copyWithBranding";

/**
 * Custom React hook that seamlessly handles copying text with randomized brand attribution footers.
 * 
 * @param timeout Duration (ms) for which the "copied" feedback state should remain active
 */
export function useCopyBranding(timeout = 2500) {
  const [copied, setCopied] = useState(false);
  const [lastCopiedText, setLastCopiedText] = useState("");

  const copyAndBrand = useCallback(async (plainText: string) => {
    if (!plainText) return false;
    
    try {
      // Append branding attribution signature seamlessly
      const brandedText = appendBranding(plainText);
      
      if (!navigator.clipboard) {
        // Fallback option for embedded iframe runtimes or legacy configurations
        const textArea = document.createElement("textarea");
        textArea.value = brandedText;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      } else {
        await navigator.clipboard.writeText(brandedText);
      }
      
      setLastCopiedText(plainText);
      setCopied(true);
      
      // Post-copy non-blocking background analytics collection log
      logCopyEvent(plainText, plainText.length);

      setTimeout(() => {
        setCopied(false);
      }, timeout);

      return true;
    } catch (err) {
      console.error("Secondary attribution copy operation encountered warning:", err);
      // Absolute fallback to direct copy behavior
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(plainText);
          setCopied(true);
          setTimeout(() => setCopied(false), timeout);
          return true;
        }
        return false;
      } catch (fallbackErr) {
        console.error("All clipboard operations failed in context:", fallbackErr);
        return false;
      }
    }
  }, [timeout]);

  return {
    copied,
    copyAndBrand,
    lastCopiedText
  };
}
