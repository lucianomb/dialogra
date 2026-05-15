'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import useVapi from "@/hooks/useVapi";
import {Mic, MicOff} from "lucide-react";
import {IBook} from "@/types";
import Image from "next/image";
import Transcript from "@/components/Transcript";

const VapiControls = ({book}: {book: IBook}) => {
  const {
    status,
    isActive,
    messages,
    currentMessage,
    currentUserMessage,
    duration,
    maxDurationSeconds,
    limitError,
    didTimeout,
    start,
    stop,
  } = useVapi(book);
  const router = useRouter();
  const isAiResponding = status === 'thinking' || status === 'speaking';

  useEffect(() => {
    if (didTimeout) {
      router.push('/');
    }
  }, [didTimeout, router]);

  const statusConfig = {
    idle: { label: 'Ready', dotClass: 'vapi-status-dot-ready' },
    connecting: { label: 'Connecting', dotClass: 'vapi-status-dot-connecting' },
    starting: { label: 'Speaking', dotClass: 'vapi-status-dot-speaking' },
    listening: { label: 'Listening', dotClass: 'vapi-status-dot-listening' },
    thinking: { label: 'Thinking', dotClass: 'vapi-status-dot-thinking' },
    speaking: { label: 'Speaking', dotClass: 'vapi-status-dot-speaking' },
  } as const;

  const currentStatus = statusConfig[status];
  const formatDuration = (value: number) => {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Centered Content */}
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* Header Card */}
        <div className="vapi-header-card">
          {/* Cover Image + Mic Button */}
          <div className="vapi-cover-wrapper">
            <Image
              src={book.coverURL || '/assets/open-book.svg'}
              alt={book.title}
              width={162}
              height={240}
              className="vapi-cover-image"
            />
            <div className="vapi-mic-wrapper">
              {isActive && isAiResponding && <span className="vapi-pulse-ring" aria-hidden="true" />}
              <button
                onClick={isActive ? stop : start}
                disabled={status === 'connecting'}
                className={`vapi-mic-btn ${isActive ? 'vapi-mic-btn-active' : 'vapi-mic-btn-inactive'}`}
                aria-label={isActive ? 'Stop microphone' : 'Start microphone'}
              >
                {isActive
                  ? <Mic className="w-5 h-5 text-(--text-primary)" />
                  : <MicOff className="w-5 h-5 text-(--text-primary)" />}
              </button>
            </div>
          </div>

          {/* Book Info */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-(--text-primary) leading-tight">
                {book.title}
              </h1>
              <p className="text-(--text-secondary) mt-1">by {book.author}</p>
            </div>

            {/* Status Badges Row */}
            <div className="flex flex-wrap gap-2">
              {/* Live call status */}
              <div className="vapi-status-indicator">
                <span className={`vapi-status-dot ${currentStatus.dotClass}`} />
                <span className="vapi-status-text">{currentStatus.label}</span>
              </div>

              {/* Voice */}
              <div className="vapi-status-indicator">
                <span className="vapi-status-text">Voice:&nbsp;{book.persona || 'Default'}</span>
              </div>

              {/* Timer */}
              <div className="vapi-status-indicator">
                <span className="vapi-status-text">
                  {formatDuration(duration)}/{formatDuration(maxDurationSeconds)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {limitError && (
          <div className="warning-banner">
            <div className="warning-banner-content">
              <span className="warning-banner-text">{limitError}</span>
            </div>
          </div>
        )}

        <div className="vapi-transcript-wrapper">
          <Transcript
            messages={messages}
            currentMessage={currentMessage}
            currentUserMessage={currentUserMessage}
          />
        </div>
      </div>
    </>
  )
}
export default VapiControls
