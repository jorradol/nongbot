import { useState, useCallback } from "react";

export function useEditableMessage(initialText: string, onSave?: (newText: string) => void) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(initialText);

  const startEditing = useCallback(() => {
    setEditText(initialText);
    setIsEditing(true);
  }, [initialText]);

  const cancelEditing = useCallback(() => {
    setEditText(initialText);
    setIsEditing(false);
  }, [initialText]);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(editText);
    }
    setIsEditing(false);
  }, [editText, onSave]);

  return {
    isEditing,
    editText,
    setEditText,
    startEditing,
    cancelEditing,
    handleSave,
  };
}
