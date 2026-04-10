import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VoiceControl({ onCommand }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [supported, setSupported] = useState(true);
  const recogRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onresult = (e) => {
      const res = e.results[e.resultIndex];
      const text = res[0].transcript.toLowerCase().trim();
      setTranscript(text);
      if (res.isFinal) processCommandRef.current(text);
    };
    r.onend = () => setIsListening(false);
    r.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'not-allowed') setFeedback('Microphone access denied');
    };
    recogRef.current = r;
    return () => r.abort();
  }, []);

  const processCommand = useCallback((text) => {
    let action = null;
    if (text.includes('turn on') && text.includes('light')) { action = { type: 'relay1', value: 'ON' }; setFeedback('✓ Light turned on'); }
    else if (text.includes('turn off') && text.includes('light')) { action = { type: 'relay1', value: 'OFF' }; setFeedback('✓ Light turned off'); }
    else if (text.includes('turn on') && text.includes('motor')) { action = { type: 'motor', value: 'ON' }; setFeedback('✓ Motor started'); }
    else if (text.includes('turn off') && text.includes('motor')) { action = { type: 'motor', value: 'OFF' }; setFeedback('✓ Motor stopped'); }
    else if (text.includes('open') && text.includes('door')) { action = { type: 'door', value: 'OPEN' }; setFeedback('✓ Door opening'); }
    else if (text.includes('close') && text.includes('door')) { action = { type: 'door', value: 'CLOSED' }; setFeedback('✓ Door closing'); }
    else setFeedback('Command not recognized');
    if (action) onCommand(action);
    setTimeout(() => { setFeedback(''); setTranscript(''); }, 3000);
  }, [onCommand]);

  // Keep a ref to processCommand so the SpeechRecognition callback
  // always calls the latest version (avoids stale closure)
  const processCommandRef = useRef(processCommand);
  useEffect(() => { processCommandRef.current = processCommand; }, [processCommand]);

  const toggle = () => {
    if (!recogRef.current) return;
    if (isListening) { recogRef.current.stop(); setIsListening(false); }
    else { setTranscript(''); setFeedback(''); recogRef.current.start(); setIsListening(true); }
  };

  if (!supported) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 flex items-center gap-3">
        <span className="text-2xl">🎙️</span>
        <p className="text-sm text-gray-400">Voice control not supported in this browser</p>
      </motion.div>
    );
  }

  const commands = ['"Turn on/off light"', '"Turn on/off motor"', '"Open/Close door"'];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }} className="glass-card p-5">

      {/* Title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(0,212,255,0.12)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white leading-tight">Voice Control</h2>
          <p className="text-xs text-gray-500">Web Speech API</p>
        </div>
      </div>

      {/* Mic + transcript row */}
      <div className="flex items-center gap-4 mb-4">
        {/* Mic button */}
        <motion.button id="voice-control-btn" onClick={toggle}
          className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
          style={{
            background: isListening ? 'linear-gradient(135deg,#00d4ff,#a855f7)' : 'rgba(255,255,255,0.06)',
            border: `2px solid ${isListening ? '#00d4ff' : 'rgba(255,255,255,0.1)'}`,
          }}
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
          animate={isListening ? { boxShadow: ['0 0 0 0 rgba(0,212,255,0.3)', '0 0 0 16px rgba(0,212,255,0)', '0 0 0 0 rgba(0,212,255,0)'] } : {}}
          transition={isListening ? { duration: 1.5, repeat: Infinity } : {}}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke={isListening ? 'white' : '#6b7280'} strokeWidth="2" strokeLinecap="round">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </motion.button>

        {/* Status / transcript area */}
        <div className="flex-1 min-w-0">
          <p className="text-xs mb-2" style={{ color: isListening ? '#00d4ff' : '#6b7280' }}>
            {isListening ? '🎙️ Listening...' : 'Tap mic to speak'}
          </p>
          <AnimatePresence mode="wait">
            {transcript ? (
              <motion.p key="transcript" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs text-white font-medium truncate">"{transcript}"</motion.p>
            ) : (
              <motion.div key="cmds" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-0.5">
                {commands.map((c, i) => (
                  <p key={i} className="text-[10px] text-gray-600 font-mono truncate">{c}</p>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="px-3 py-2 rounded-lg text-xs font-medium text-center"
            style={feedback.startsWith('✓')
              ? { background: 'rgba(0,255,136,0.08)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)' }
              : { background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
