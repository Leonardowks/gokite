import { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { hasTourForRoute, getTourForRoute, TourConfig } from "@/lib/tourConfig";

interface UseTourReturn {
  isRunning: boolean;
  currentTour: TourConfig | null;
  startTour: () => void;
  stopTour: () => void;
  hasSeenTour: boolean;
  hasTourAvailable: boolean;
  markTourAsSeen: () => void;
  resetAllTours: () => void;
}

const TOUR_STORAGE_KEY = "gokite_tours_completed";

export function useTour(): UseTourReturn {
  const location = useLocation();
  const [isRunning, setIsRunning] = useState(false);
  const currentRoute = location.pathname;

  const getCompletedTours = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(TOUR_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const currentTour = getTourForRoute(currentRoute);
  const hasTourAvailable = hasTourForRoute(currentRoute);
  const hasSeenTour = currentTour 
    ? getCompletedTours().includes(currentTour.id) 
    : true;

  const startTour = useCallback(() => {
    if (currentTour) {
      setIsRunning(true);
    }
  }, [currentTour]);

  const stopTour = useCallback(() => {
    setIsRunning(false);
  }, []);

  const markTourAsSeen = useCallback(() => {
    if (currentTour) {
      const completed = getCompletedTours();
      if (!completed.includes(currentTour.id)) {
        completed.push(currentTour.id);
        localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed));
      }
    }
  }, [currentTour, getCompletedTours]);

  const resetAllTours = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  }, []);

  // Parar tour ao mudar de rota
  useEffect(() => {
    setIsRunning(false);
  }, [currentRoute]);

  return {
    isRunning,
    currentTour,
    startTour,
    stopTour,
    hasSeenTour,
    hasTourAvailable,
    markTourAsSeen,
    resetAllTours,
  };
}
