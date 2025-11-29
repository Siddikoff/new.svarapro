import { useState, useEffect } from 'react';

export const useFilterState = (): [boolean, (value: boolean) => void] => {
  const [isAvailable, setIsAvailable] = useState(() => {
    try {
      const saved = localStorage.getItem('isAvailableFilter');
      return saved !== null ? JSON.parse(saved) : false;
    } catch (error) {
      console.error("Failed to parse isAvailableFilter from localStorage", error);
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('isAvailableFilter', JSON.stringify(isAvailable));
    } catch (error) {
      console.error("Failed to set isAvailableFilter in localStorage", error);
    }
  }, [isAvailable]);

  return [isAvailable, setIsAvailable];
};
