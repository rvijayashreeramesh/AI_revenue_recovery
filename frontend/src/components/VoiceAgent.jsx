import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PhoneCall,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Send,
  Radio,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWebSpeech } from '../hooks/useWebSpeech';

export const VoiceAgent = ({ activeCase, onCaseRecovered }) => {
  const currentCase = activeCase || {
    caseId: 'RCV-9842',
    caseNumber: 'RCV-9842',
    customer: {
      name: 'Rahul Sharma',
      company: 'Apex Retail Tech',
      phone: '+91 91508 40158',
    },
    amount: 4999,
  };

  const [callActive, setCallActive] = useState(false);
  const [sessionStep, setSessionStep] = useState(0);
  const [callLogs, setCallLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const logContainerRef = useRef(null);

  // Forward ref for submitting speech turns so useWebSpeech can call it
  const submitSpeechTurnRef = useRef(null);

  const handleSpeechEnd = useCallback((spokenText) => {
    if (submitSpeechTurnRef.current) {
      submitSpeechTurnRef.current(spokenText);
    }
  }, []);

  const {
    isListening,
    isSpeaking,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    isSupported,
    error: speechError,
  } = useWebSpeech({ onSpeechEnd: handleSpeechEnd });

  // Auto-scroll transcript container to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [callLogs]);

  // Submit speech turn to backend and handle TTS response
  const submitSpeechTurn = useCallback(
    async (text) => {
      const input = (text || inputText || transcript || '').trim();
      if (!input) return;

      stopListening();
      setIsProcessing(true);
      setInputText('');
      setTranscript('');

      const userEntry = {
        speaker: 'user',
        text: input,
        time: new Date().toLocaleTimeString(),
      };
      setCallLogs((prev) => [...prev, userEntry]);

      try {
        const res = await fetch('/api/simulation/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: currentCase.caseNumber || currentCase.caseId,
            userTranscript: input,
            sessionStep,
          }),
        });

        const data = await res.json();
        if (data?.data) {
          const { agentResponse, sessionStep: nextStep, isFinished, recovered } = data.data;
          setSessionStep(nextStep);

          setCallLogs((prev) => [
            ...prev,
            { speaker: 'agent', text: agentResponse, time: new Date().toLocaleTimeString() },
          ]);

          speak(agentResponse, () => {
            if (isFinished) {
              setCallActive(false);
            } else {
              // Automatically re-arm microphone for the next cardholder turn!
              startListening();
            }
          });

          if (recovered) {
            confetti({
              particleCount: 120,
              spread: 90,
              origin: { y: 0.6 },
              colors: ['#06B6D4', '#10B981', '#F59E0B'],
            });
            if (onCaseRecovered) onCaseRecovered(currentCase);
          }
        }
      } catch (err) {
        console.error('[VoiceAgent] Speech turn error:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      currentCase,
      inputText,
      transcript,
      sessionStep,
      onCaseRecovered,
      speak,
      startListening,
      stopListening,
      setTranscript,
    ]
  );

  submitSpeechTurnRef.current = submitSpeechTurn;

  // Start call session
  const startCall = async () => {
    setCallActive(true);
    setSessionStep(0);
    setCallLogs([]);

    const amountVal = currentCase.transaction?.amount || currentCase.amount || 4999;
    const initialGreeting = `Hello ${currentCase.customer?.name || 'Valued Partner'}, this is the dedicated AI Voice Concierge for AI Revenue Recovery regarding your interrupted payment of ₹${Number(amountVal).toLocaleString('en-IN')}. How can I assist you with completing this settlement today?`;

    setCallLogs([{ speaker: 'agent', text: initialGreeting, time: new Date().toLocaleTimeString() }]);

    // Speak initial greeting aloud, then automatically activate microphone
    speak(initialGreeting, () => {
      startListening();
    });
  };

  const endCall = () => {
    setCallActive(false);
    stopSpeaking();
    stopListening();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Voice Controls & Visual Waveform */}
      <div className="lg:col-span-5 space-y-4">
        <div className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700">
                <PhoneCall className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold tracking-tight uppercase font-sans text-slate-900">
                Autonomous AI Voice Concierge
              </h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-mono border font-semibold ${
                callActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {callActive ? 'LINE ACTIVE' : 'DISCONNECTED'}
            </span>
          </div>

          <p className="mt-3 text-xs text-slate-500 font-sans">
            Real-time conversational voice concierge with Web Speech API integration and spoken re-authorization.
          </p>

          {/* Interactive Call Status Box */}
          <div className="mt-4 p-5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center text-center">
            {/* Waveform Visualization */}
            <div className="h-16 flex items-center justify-center gap-1.5 my-3">
              {[40, 75, 95, 60, 30, 85, 100, 50, 65, 80, 45, 90].map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isSpeaking
                      ? 'bg-cyan-600 animate-pulse'
                      : isListening
                      ? 'bg-emerald-600 animate-bounce'
                      : 'bg-slate-300'
                  }`}
                  style={{
                    height: callActive && (isSpeaking || isListening) ? `${h}%` : '15%',
                  }}
                />
              ))}
            </div>

            {/* Live Audio Status Pill */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {isSpeaking ? (
                <span className="text-cyan-700 font-semibold flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-600" />
                  AI Concierge Speaking (TTS)...
                </span>
              ) : isListening ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1 animate-pulse">
                  <Radio className="w-3.5 h-3.5 text-emerald-600" />
                  Microphone Active • Speak Now
                </span>
              ) : callActive ? (
                <span className="text-slate-500">Awaiting user response</span>
              ) : (
                <span className="text-slate-400">Call Line Ready for Dispatch</span>
              )}
            </div>

            {/* Live transcript indicator if user is currently speaking */}
            {isListening && transcript && (
              <div className="mt-2.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-mono text-emerald-900 max-w-full truncate">
                Heard: "{transcript}"
              </div>
            )}

            {/* Call Toggle Button */}
            <div className="mt-4 flex gap-2">
              {!callActive ? (
                <button
                  onClick={startCall}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-semibold shadow-xs transition-all flex items-center gap-2"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Initiate Concierge Call
                </button>
              ) : (
                <button
                  onClick={endCall}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-semibold shadow-xs transition-all flex items-center gap-2"
                >
                  <PhoneCall className="w-3.5 h-3.5 rotate-[135deg]" />
                  Terminate Call
                </button>
              )}
            </div>
          </div>

          {/* Interactive Microphone & Spoken Input Box */}
          {callActive && (
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-700 uppercase font-bold flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-emerald-600" />
                  Voice / Spoken Input
                </span>
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border transition-all flex items-center gap-1.5 ${
                    isListening
                      ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {isListening ? (
                    <>
                      <Mic className="w-3 h-3" />
                      <span>Listening (Click to Mute)</span>
                    </>
                  ) : (
                    <>
                      <MicOff className="w-3 h-3" />
                      <span>Mic Off (Click to Speak)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Text input with send button in case user wants to type or confirm transcript */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText || transcript}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      submitSpeechTurn(inputText || transcript);
                    }
                  }}
                  placeholder={
                    isListening
                      ? 'Listening... Speak or type your reply...'
                      : 'Type or click mic to speak...'
                  }
                  className="flex-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                />
                <button
                  onClick={() => submitSpeechTurn(inputText || transcript)}
                  disabled={isProcessing}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-xs disabled:opacity-50"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Spoken Quick Options for Testing */}
              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1.5">
                  Or Test Quick Scenarios:
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    onClick={() => submitSpeechTurn('Yes, speaking. What is this concerning?')}
                    className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-mono border border-slate-200 transition-colors"
                  >
                    › "Yes, speaking. What is this concerning?"
                  </button>
                  <button
                    onClick={() => submitSpeechTurn('Yes, please go ahead and retry the transaction now.')}
                    className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-emerald-700 font-mono border border-emerald-200 font-medium transition-colors"
                  >
                    › "Yes, please go ahead and retry the transaction now."
                  </button>
                  <button
                    onClick={() => submitSpeechTurn('Can you send me a secure payment link by WhatsApp instead?')}
                    className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-cyan-800 font-mono border border-cyan-200 transition-colors"
                  >
                    › "Can you send me a secure payment link by WhatsApp instead?"
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Transcript Ledger */}
      <div className="lg:col-span-7">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs p-6 flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold tracking-tight uppercase font-sans text-slate-900">
                Live Speech Forensic Transcript
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Case: {currentCase.caseNumber || currentCase.caseId}
            </span>
          </div>

          <div ref={logContainerRef} className="flex-1 overflow-y-auto space-y-3 py-4">
            {callLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center">
                <PhoneCall className="w-6 h-6 text-slate-300 mb-2" />
                Click "Initiate Concierge Call" to launch interactive voice negotiation session.
              </div>
            ) : (
              callLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${log.speaker === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed ${
                      log.speaker === 'user'
                        ? 'bg-emerald-50 text-emerald-950 border border-emerald-200/80'
                        : 'bg-slate-50 text-slate-900 border border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 font-mono mb-1">
                      <span className="font-semibold uppercase text-slate-600">
                        {log.speaker === 'agent' ? 'AI Voice Agent (TTS)' : 'Cardholder / Customer'}
                      </span>
                      <span>{log.time}</span>
                    </div>
                    <p className="font-sans">{log.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceAgent;
