import React from 'react';
import { Mic } from 'lucide-react';
import { parseGantWakePhrase } from '../voice/parseGantWakePhrase';

export default function FloatingMicLauncher({ active, onRecognized, onOpen }) {
  const [busy, setBusy] = React.useState(false);

  const startOneShot = React.useCallback(() => {
    onOpen?.();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'hr-HR';
    setBusy(true);
    let finalText = '';
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
      }
    };
    rec.onend = () => {
      setBusy(false);
      onRecognized?.(parseGantWakePhrase(finalText), finalText);
    };
    rec.start();
  }, [onRecognized, onOpen]);

  if (!active) return null;
  return (
    <button
      onClick={startOneShot}
      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                 shadow-2xl rounded-full p-6 bg-accent text-white hover:opacity-90 z-50"
      title="Izgovori: 'Gant', 'Gant prodaja', 'Gant proizvodnja' ili 'Gant općenito'"
    >
      <Mic className={`w-7 h-7 ${busy ? 'animate-pulse' : ''}`} />
    </button>
  );
}