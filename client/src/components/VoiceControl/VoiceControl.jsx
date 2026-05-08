import { useState, useEffect, useRef, useCallback } from 'react';
import VoiceControlView from './VoiceControlView';

export default function VoiceControl({ onCommand }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [supported, setSupported] = useState(true);
  const recogRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }

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

  // Process voice command
  const processCommand = useCallback(
    (text) => {
      let action = null;

      if (text.includes('turn on') && text.includes('light')) {
        action = { type: 'relay1', value: 'ON' };
        setFeedback('✓ Light turned on');
      } else if (text.includes('turn off') && text.includes('light')) {
        action = { type: 'relay1', value: 'OFF' };
        setFeedback('✓ Light turned off');
      } else if (text.includes('turn on') && text.includes('motor')) {
        action = { type: 'motor', value: 'ON' };
        setFeedback('✓ Motor started');
      } else if (text.includes('turn off') && text.includes('motor')) {
        action = { type: 'motor', value: 'OFF' };
        setFeedback('✓ Motor stopped');
      } else if (text.includes('open') && text.includes('door')) {
        action = { type: 'door', value: 'OPEN' };
        setFeedback('✓ Door opening');
      } else if (text.includes('close') && text.includes('door')) {
        action = { type: 'door', value: 'CLOSED' };
        setFeedback('✓ Door closing');
      } else {
        setFeedback('Command not recognized');
      }

      if (action) onCommand(action);

      setTimeout(() => {
        setFeedback('');
        setTranscript('');
      }, 3000);
    },
    [onCommand]
  );

  // Keep ref for latest processCommand function
  const processCommandRef = useRef(processCommand);
  useEffect(() => {
    processCommandRef.current = processCommand;
  }, [processCommand]);

  // Toggle listening
  const toggle = () => {
    if (!recogRef.current) return;
    if (isListening) {
      recogRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setFeedback('');
      recogRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <VoiceControlView
      supported={supported}
      isListening={isListening}
      transcript={transcript}
      feedback={feedback}
      onToggle={toggle}
    />
  );
}
