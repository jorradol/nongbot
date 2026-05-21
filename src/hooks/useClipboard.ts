import { useState, useCallback } from "react";

export function useClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(
    async (text: string) => {
      if (!navigator.clipboard) {
        console.warn("Clipboard API not supported");
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, timeout);
        return true;
      } catch (err) {
        console.error("Failed to copy text: ", err);
        return false;
      }
    },
    [timeout]
  );

  return { copied, copyToClipboard };
}
