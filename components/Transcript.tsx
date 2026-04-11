'use client';

import { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
import { Messages } from '@/types';

interface TranscriptProps {
  messages: Messages[];
  currentMessage: string;
  currentUserMessage: string;
}

const Transcript = ({ messages, currentMessage, currentUserMessage }: TranscriptProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  const isEmpty = messages.length === 0 && !currentMessage && !currentUserMessage;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentMessage, currentUserMessage]);

  if (isEmpty) {
    return (
      <div className="transcript-container">
        <div className="transcript-empty">
          <Mic className="w-12 h-12 text-(--text-primary) mb-4" strokeWidth={1.5} />
          <p className="transcript-empty-text">No conversation yet</p>
          <p className="transcript-empty-hint">Click the mic button above to start talking</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transcript-container">
      <div className="transcript-messages">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`transcript-message ${isUser ? 'transcript-message-user' : 'transcript-message-assistant'}`}
            >
              <div className={`transcript-bubble ${isUser ? 'transcript-bubble-user' : 'transcript-bubble-assistant'}`}>
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* Streaming user message */}
        {currentUserMessage && (
          <div className="transcript-message transcript-message-user">
            <div className="transcript-bubble transcript-bubble-user">
              {currentUserMessage}
              <span className="transcript-cursor" />
            </div>
          </div>
        )}

        {/* Streaming assistant message */}
        {currentMessage && (
          <div className="transcript-message transcript-message-assistant">
            <div className="transcript-bubble transcript-bubble-assistant">
              {currentMessage}
              <span className="transcript-cursor" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default Transcript;

