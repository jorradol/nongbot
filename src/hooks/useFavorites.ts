import { useState, useEffect, useCallback } from "react";

export interface FavoriteMessage {
  id: string;
  role: "model" | "user";
  content: string;
  timestamp: string;
  savedAt: string;
}

const STORAGE_KEY = "nongbot_favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteMessage[]>([]);

  // Load favorites on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load favorites from localStorage", e);
    }
  }, []);

  // Save to localStorage
  const saveFavoritesToStorage = (updated: FavoriteMessage[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save favorites to localStorage", e);
    }
  };

  const isFavorite = useCallback(
    (id: string) => {
      return favorites.some((fav) => fav.id === id);
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    (message: { id: string; role: "model" | "user"; content: string; timestamp?: string }) => {
      setFavorites((prev) => {
        const index = prev.findIndex((fav) => fav.id === message.id);
        let updated: FavoriteMessage[];

        if (index > -1) {
          // Remove from favorites
          updated = prev.filter((fav) => fav.id !== message.id);
        } else {
          // Add to favorites
          const newFav: FavoriteMessage = {
            id: message.id,
            role: message.role,
            content: message.content,
            timestamp: message.timestamp || new Date().toISOString(),
            savedAt: new Date().toISOString(),
          };
          updated = [...prev, newFav];
        }

        saveFavoritesToStorage(updated);
        return updated;
      });
    },
    []
  );

  return {
    favorites,
    isFavorite,
    toggleFavorite,
  };
}
