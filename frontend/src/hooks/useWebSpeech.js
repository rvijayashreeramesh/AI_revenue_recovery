import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebSpeech = ({ onSpeechEnd } = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const onSpeechEndRef = useRef(onSpeechEnd);
  onSpeechEndRef.current = onSpeechEnd;
  const silenceTimerRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;

    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let interimText = '';
        let finalText = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalText += res[0].transcript;
          } else {
            interimText += res[0].transcript;
          }
        }

        const combined = (finalText + ' ' + interimText).trim();
        transcriptRef.current = combined;
        setTranscript(combined);

        // Auto-submit on speech pause if text is recognized
        if (combined.length > 2) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            const captured = transcriptRef.current.trim();
            if (captured && onSpeechEndRef.current) {
              transcriptRef.current = '';
              setTranscript('');
              try {
                recognition.stop();
              } catch (e) {}
              onSpeechEndRef.current(captured);
            }
          }, 1400);
        }
      };

      recognition.onerror = (evt) => {
        console.warn('SpeechRecognition error:', evt.error);
        setError(evt.error);
        setIsListening(false);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        // If speech ended with valid text before error, dispatch it
        const captured = transcriptRef.current.trim();
        if (captured && captured.length > 2 && onSpeechEndRef.current) {
          transcriptRef.current = '';
          setTranscript('');
          onSpeechEndRef.current(captured);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        const captured = transcriptRef.current.trim();
        if (captured && captured.length > 2 && onSpeechEndRef.current) {
          transcriptRef.current = '';
          setTranscript('');
          onSpeechEndRef.current(captured);
        }
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      transcriptRef.current = '';
      setError(null);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('SpeechRecognition start error:', e.message);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('SpeechRecognition stop error:', e.message);
      }
    }
  }, [isListening]);

  const speak = useCallback((text, onEnd) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 1.0;

    // Select natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.name.includes('Google') ||
        v.name.includes('Natural') ||
        v.name.includes('Samantha') ||
        v.lang === 'en-US'
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    setTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
};

export default useWebSpeech;
