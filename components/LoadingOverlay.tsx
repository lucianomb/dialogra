'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingOverlayProps {
  title?: string
  progress?: Array<{
    label: string
    status: 'pending' | 'active' | 'completed'
  }>
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  title = 'Generating Interactive Interview',
  progress = [
    { label: 'Extracting text from PDF', status: 'completed' },
    { label: 'Generating Q&A pairs', status: 'active' },
    { label: 'Setting up voice synthesis', status: 'pending' },
  ],
}) => {
  return (
    <div className="loading-wrapper">
      <div className="loading-shadow-wrapper bg-white">
        <div className="loading-shadow">
          <Loader2 className="loading-animation w-12 h-12 text-(--text-primary)" />
          <h2 className="loading-title">{title}</h2>
          <div className="loading-progress">
            {progress.map((item, index) => (
              <div key={index} className="loading-progress-item">
                <div
                  className={`loading-progress-status ${
                    item.status === 'completed' ? 'bg-(--success)' : 'bg-(--warning)'
                  }`}
                />
                <span className="text-(--text-secondary)">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoadingOverlay




