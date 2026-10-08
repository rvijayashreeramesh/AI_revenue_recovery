import React, { useState } from 'react';
import { Send, Bot, Sparkles, Terminal, CornerDownLeft, ShieldCheck } from 'lucide-react';

export const Copilot = ({ cases }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am your **AI Revenue Recovery Copilot**. I analyze card switch declines, liquidity cycles, and optimize payment retry windows across Stripe, Adyen, and Checkout.com.\n\nAsk me anything about active recovery cases, decline root causes, or mitigation recommendations.',
      model: 'Groq Llama-3.3-70B / Gemini 2.5',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const predefinedPrompts = [
    'What is our current recovery efficiency & pipeline risk?',
    'Why did the largest enterprise payment decline?',
    'Which cases require immediate omnichannel dispatch?',
  ];

  const handleSend = async (queryText) => {
    const text = queryText || inputQuery;
    if (!text.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/copilot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });

      const data = await res.json();
      if (data?.data) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.data.answer,
            model: data.data.model,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to reach Copilot inference gateway. Please check your network connection.',
          model: 'Error',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-translucent bg-carbon-850/90 backdrop-blur-md flex flex-col h-[640px] overflow-hidden shadow-2xl">
      {/* Copilot Header */}
      <div className="p-4 border-b border-translucent bg-carbon-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-carbon-950 border border-cyan-500/30 text-cyan-400 shadow-glow-cyan">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-wide text-white uppercase font-sans">
                Fintech Recovery Intelligence Copilot
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              In-context conversational reasoning powered by Groq Llama 3.3 70B & Gemini 2.5
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-recovered" />
          <span>Zero-Retention Audited Query Pipe</span>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-carbon-800 text-white border border-white/10'
                  : 'bg-carbon-900 text-slate-200 border border-cyan-500/20 shadow-glow-cyan'
              }`}
            >
              <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 font-mono mb-1.5 border-b border-white/[0.04] pb-1">
                <span className="font-semibold uppercase text-cyan-400 flex items-center gap-1">
                  {m.role === 'assistant' ? (
                    <>
                      <Sparkles className="w-2.5 h-2.5" />
                      Recovery Copilot
                    </>
                  ) : (
                    'Fintech Operator'
                  )}
                </span>
                <span>{m.time}</span>
              </div>

              <div className="whitespace-pre-wrap font-sans text-[12px]">{m.content}</div>

              {m.model && (
                <div className="mt-2 text-[10px] text-slate-500 font-mono">Model: {m.model}</div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono p-3 bg-carbon-900 rounded-lg w-max border border-cyan-500/20">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            Synthesizing recovery reasoning chain...
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 bg-carbon-900/60 border-t border-translucent flex flex-wrap gap-1.5">
        <span className="text-[10px] font-mono text-slate-400 py-1 mr-1">Quick Prompts:</span>
        {predefinedPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p)}
            className="text-[11px] font-mono px-2.5 py-1 rounded bg-carbon-800 hover:bg-carbon-700 text-slate-300 border border-white/5 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-3 bg-carbon-900 border-t border-translucent flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask Copilot about payment declines, retries, or liquidity..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-carbon-950 text-xs font-mono text-white placeholder-slate-500 px-4 py-2.5 rounded-lg border border-translucent focus:outline-none focus:border-cyan-500/50"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !inputQuery.trim()}
          className="p-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold shadow-glow-cyan disabled:opacity-40 transition-colors flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ask</span>
        </button>
      </div>
    </div>
  );
};

export default Copilot;
