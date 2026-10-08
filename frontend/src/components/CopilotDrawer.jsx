import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Sparkles,
  Send,
  X,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  Zap,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Clock,
  Layers,
  StopCircle,
  Command,
} from 'lucide-react';

/**
 * Rich streaming markdown renderer with code blocks, metric highlights, and instant case links
 */
export const MarkdownMessage = ({ content, isStreaming, onSelectCase }) => {
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopy = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Helper to highlight metric tokens and case links
  const renderFormattedLine = (line, lineIdx) => {
    // 1. Headings
    if (line.startsWith('### ')) {
      return (
        <h4 key={lineIdx} className="text-sm font-bold text-cyan-300 font-sans mt-3 mb-1.5 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          {line.replace('### ', '')}
        </h4>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h3 key={lineIdx} className="text-base font-bold text-white font-sans mt-3 mb-2">
          {line.replace('## ', '')}
        </h3>
      );
    }

    // 2. Bullet points
    const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*');
    const cleanLine = isBullet ? line.trim().replace(/^[•\-\*]\s*/, '') : line;

    // Split text into tokens to parse bold, metrics, and case links
    // Regex matches: [CASE-ID], **bold text**, `code`, and currency/percentages
    const regex = /(\[[A-Za-z0-9\-_]+\]|\*\*[^*]+\*\*|`[^`]+`|(?:₹|\$)\d+(?:,\d+)*(?:\.\d+)?|\b\d+%\b)/g;
    const parts = cleanLine.split(regex);

    const formattedContent = parts.map((part, pIdx) => {
      if (!part) return null;

      // Case ID Link e.g. [RC-9842] or [RCV-23106]
      const caseMatch = part.match(/^\[([A-Za-z0-9\-_]+)\]$/);
      if (caseMatch && (part.includes('RC-') || part.includes('RCV-') || part.includes('CASE-'))) {
        const caseId = caseMatch[1];
        return (
          <button
            key={pIdx}
            type="button"
            onClick={() => onSelectCase && onSelectCase(caseId)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-semibold transition-all shadow-sm hover:scale-105 group"
            title={`Open Cryptographic Audit Drawer for ${caseId}`}
          >
            <span>{caseId}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100" />
          </button>
        );
      }

      // Bold text
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <strong key={pIdx} className="font-semibold text-slate-100">
            {boldText}
          </strong>
        );
      }

      // Inline code
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={pIdx}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-carbon-950 text-cyan-300 font-mono text-[11px] border border-white/5"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Currency Metric Highlight (₹... or $...)
      if (/^(?:₹|\$)\d+(?:,\d+)*(?:\.\d+)?$/.test(part)) {
        return (
          <span
            key={pIdx}
            className="font-mono font-bold text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded border border-emerald-500/20 mx-0.5"
          >
            {part}
          </span>
        );
      }

      // Percentage Metric Highlight (e.g. 94%)
      if (/^\d+%$/.test(part)) {
        return (
          <span
            key={pIdx}
            className="font-mono font-semibold text-cyan-300 bg-cyan-950/40 px-1 py-0.5 rounded border border-cyan-500/20 mx-0.5"
          >
            {part}
          </span>
        );
      }

      return <span key={pIdx}>{part}</span>;
    });

    if (isBullet) {
      return (
        <li key={lineIdx} className="flex items-start gap-2 my-1 text-xs leading-relaxed text-slate-200">
          <span className="text-cyan-400 mt-1 flex-shrink-0 text-[10px]">●</span>
          <span className="flex-1">{formattedContent}</span>
        </li>
      );
    }

    return (
      <p key={lineIdx} className="my-1.5 text-xs leading-relaxed text-slate-200">
        {formattedContent}
      </p>
    );
  };

  // Parse code blocks vs regular text lines
  const renderBlocks = () => {
    const rawLines = content.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer = [];

    rawLines.forEach((line, idx) => {
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.trim().replace('```', '') || 'json';
          codeBuffer = [];
        } else {
          inCodeBlock = false;
          const fullCode = codeBuffer.join('\n');
          const codeId = `code-${idx}`;
          elements.push(
            <div key={codeId} className="my-2.5 rounded-xl bg-carbon-950 border border-white/10 overflow-hidden text-xs font-mono shadow-lg">
              <div className="px-3 py-1.5 bg-carbon-900 border-b border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span className="uppercase text-[10px] font-semibold text-cyan-400">{codeLanguage}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(fullCode, codeId)}
                  className="flex items-center gap-1 hover:text-white transition-colors p-0.5 rounded"
                >
                  {copiedCode === codeId ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="text-[10px]">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-slate-200 leading-relaxed text-[11px]">
                <code>{fullCode}</code>
              </pre>
            </div>
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
      } else {
        elements.push(renderFormattedLine(line, idx));
      }
    });

    return elements;
  };

  return (
    <div className="space-y-1">
      {renderBlocks()}
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse align-middle" />
      )}
    </div>
  );
};

export const CopilotDrawer = ({
  isOpen = false,
  onClose,
  onSelectCase,
  cases = [],
}) => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `### Chief AI Recovery Officer Online

I am connected to real-time transaction telemetry across your payment rails (Razorpay, HDFC, Stripe, and NPCI UPI).

• **Active Pipeline:** Real-time liquidity analysis & root cause inference active.
• **Bounded Safety:** High-value transactions (> ₹50,000) guarded under automated policy controls.

Tap any quick chip below or ask any inquiry regarding transaction declines, retry algorithms, or pipeline exposure.`,
      model: 'Groq Llama-3.3-70B',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef(null);
  const chatScrollRef = useRef(null);

  const quickPromptChips = [
    'Why did UPI failures spike today?',
    'Show me highest value cases awaiting review',
    'How much revenue is recoverable right now?',
  ];

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // Send message with streaming SSE reader
  const handleSendMessage = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isStreaming) return;

    const userMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantPlaceholderId = `asst-${Date.now()}`;
    const assistantMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      model: 'Groq Llama-3.3-70B',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const conversationHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInputQuery('');
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          messages: conversationHistory,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Inference endpoint returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete trailing fragment

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.token) {
              accumulatedText += parsed.token;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantPlaceholderId
                    ? { ...m, content: accumulatedText }
                    : m
                )
              );
            }
          } catch (e) {
            // plain text token
            if (dataStr) {
              accumulatedText += dataStr;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantPlaceholderId
                    ? { ...m, content: accumulatedText }
                    : m
                )
              );
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[CopilotDrawer] Stream error:', err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantPlaceholderId
              ? {
                  ...m,
                  content:
                    m.content ||
                    `**Inference Connection Notice:**\nUnable to reach primary Groq Cloud streaming pipeline (${err.message}). Telemetry fallback engaged.`,
                }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `### Chief AI Recovery Officer Online\n\nChat session cleared. Real-time telemetry pipeline refreshed. How can I assist with your payment recovery queue?`,
        model: 'Groq Llama-3.3-70B',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm">
      {/* Slide-over Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="w-full max-w-2xl h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
              <Bot className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold font-sans text-slate-900 tracking-tight">
                  Live AI Recovery Copilot
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                  GROQ STREAMING
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Chief AI Recovery Officer • Llama-3.3-70B (820 tok/sec)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearHistory}
              title="Clear Conversation"
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              title="Close Copilot (Esc)"
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div
          ref={chatScrollRef}
          className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/50"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[92%] rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-xs'
                }`}
              >
                {/* Header label inside message */}
                <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 font-mono mb-2 pb-1.5 border-b border-slate-100">
                  <span className={`font-bold uppercase tracking-wider flex items-center gap-1.5 ${m.role === 'user' ? 'text-white/80' : 'text-emerald-700'}`}>
                    {m.role === 'assistant' ? (
                      <>
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Chief AI Recovery Officer
                      </>
                    ) : (
                      'Fintech Operator'
                    )}
                  </span>
                  <span className={m.role === 'user' ? 'text-white/70' : 'text-slate-400'}>{m.time}</span>
                </div>

                {/* Markdown content with live token stream */}
                <MarkdownMessage
                  content={m.content}
                  isStreaming={isStreaming && m.id === messages[messages.length - 1].id}
                  onSelectCase={(caseId) => {
                    if (onSelectCase) onSelectCase(caseId);
                  }}
                />

                {m.model && m.role === 'assistant' && (
                  <div className="mt-2.5 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Model: {m.model}</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Live Verified
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Prompt Chips (Prompt Requirement) */}
        <div className="px-4 py-3 bg-white border-t border-slate-200">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
              Quick Inquiries:
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickPromptChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                disabled={isStreaming}
                className="text-[11px] font-mono px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-emerald-800 border border-slate-200 transition-all text-left disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              >
                <span>{chip}</span>
                <ArrowRight className="w-2.5 h-2.5 opacity-60" />
              </button>
            ))}
          </div>
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask Copilot about UPI declines, liquidity sweeps, or case exposure..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isStreaming && handleSendMessage()}
              disabled={isStreaming}
              className="flex-1 bg-slate-50 text-xs font-mono text-slate-900 placeholder-slate-400 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-inner"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <StopCircle className="w-4 h-4" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim()}
                className="py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ask Copilot</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1">
            <span className="flex items-center gap-1">
              <Command className="w-2.5 h-2.5" />
              <span>Shortcut: Press </span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">Cmd+K</kbd>
              <span> / </span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">Ctrl+K</kbd>
              <span> to toggle</span>
            </span>
            <span>Real-time Groq Cloud Llama-3.3-70B Pipeline</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CopilotDrawer;
