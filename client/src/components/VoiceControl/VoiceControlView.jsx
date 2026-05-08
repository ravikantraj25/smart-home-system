import { motion, AnimatePresence } from 'framer-motion';
import './VoiceControl.css';

export default function VoiceControlView({
  supported,
  isListening,
  transcript,
  feedback,
  onToggle,
}) {
  const commands = [
    '"Turn on/off light"',
    '"Turn on/off motor"',
    '"Open/Close door"',
  ];

  if (!supported) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="voice-control-unsupported"
      >
        <span className="text-2xl">🎙️</span>
        <p className="voice-unsupported-text">
          Voice control not supported in this browser
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="voice-control-container"
    >
      {/* Title */}
      <div className="voice-header">
        <div className="voice-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00d4ff"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <div>
          <h2 className="voice-title">Voice Control</h2>
          <p className="voice-subtitle">Web Speech API</p>
        </div>
      </div>

      {/* Mic + Transcript row */}
      <div className="voice-content">
        <motion.button
          id="voice-control-btn"
          onClick={onToggle}
          className="voice-mic-button"
          style={{
            background: isListening
              ? 'linear-gradient(135deg,#00d4ff,#a855f7)'
              : 'rgba(255,255,255,0.06)',
            border: `2px solid ${isListening ? '#00d4ff' : 'rgba(255,255,255,0.1)'}`,
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          animate={
            isListening
              ? {
                  boxShadow: [
                    '0 0 0 0 rgba(0,212,255,0.3)',
                    '0 0 0 16px rgba(0,212,255,0)',
                    '0 0 0 0 rgba(0,212,255,0)',
                  ],
                }
              : {}
          }
          transition={isListening ? { duration: 1.5, repeat: Infinity } : {}}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isListening ? 'white' : '#6b7280'}
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </motion.button>

        {/* Status / Transcript area */}
        <div className="voice-transcript-area">
          <p
            className="voice-status"
            style={{ color: isListening ? '#00d4ff' : '#6b7280' }}
          >
            {isListening ? '🎙️ Listening...' : 'Tap mic to speak'}
          </p>
          <AnimatePresence mode="wait">
            {transcript ? (
              <motion.p
                key="transcript"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="voice-transcript-text"
              >
                "{transcript}"
              </motion.p>
            ) : (
              <motion.div
                key="cmds"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="voice-commands-list"
              >
                {commands.map((c, i) => (
                  <p key={i} className="voice-command-item">
                    {c}
                  </p>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`voice-feedback ${feedback.startsWith('✓') ? 'success' : 'warning'}`}
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
