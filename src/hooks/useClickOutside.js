import { useEffect } from 'react';

/**
 * useClickOutside - Hook za detekciju klika izvan elementa
 * 
 * Korisno za zatvaranje dropdown menija, modala, itd.
 * 
 * @param {React.RefObject} ref - Ref na element
 * @param {Function} handler - Callback funkcija kad se klikne izvan
 * @param {boolean} enabled - Da li je hook aktivan
 */
export default function useClickOutside(ref, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleClickOutside(event) {
      // Provjeri da li ref postoji i da li klik nije bio unutar elementa
      if (ref.current && !ref.current.contains(event.target)) {
        handler(event);
      }
    }

    // Dodaj event listener
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [ref, handler, enabled]);
}