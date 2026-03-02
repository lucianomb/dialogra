'use client'

import React, { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, Image as ImageIcon, X } from 'lucide-react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import LoadingOverlay from '@/components/LoadingOverlay'

// Validation Schema
const formSchema = z.object({
  pdfFile: z.instanceof(File).nullable().optional().refine(
    (file) => !file || file.size <= 50 * 1024 * 1024,
    'PDF file must be max 50MB'
  ).refine(
    (file) => !file || file.type === 'application/pdf',
    'File must be a PDF'
  ),
  coverImage: z.instanceof(File).nullable().optional().refine(
    (file) => !file || file.size <= 10 * 1024 * 1024,
    'Cover image must be max 10MB'
  ).refine(
    (file) => !file || file.type.startsWith('image/'),
    'File must be an image'
  ),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  author: z.string().min(1, 'Author name is required').max(100, 'Author name must be less than 100 characters'),
  voice: z.enum(['dave', 'daniel', 'chris', 'rachel', 'sarah'])
})

type FormValues = z.infer<typeof formSchema>

const UploadForm = () => {
  const [pdfFileName, setPdfFileName] = useState<string | null>(null)
  const [coverImageFileName, setCoverImageFileName] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pdfFile: undefined,
      coverImage: undefined,
      title: '',
      author: '',
      voice: 'rachel',
    },
  })

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPdfFileName(file.name)
      form.setValue('pdfFile', file)
      form.clearErrors('pdfFile')
    }
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverImageFileName(file.name)
      form.setValue('coverImage', file)
      form.clearErrors('coverImage')
    }
  }

  const removePdfFile = () => {
    setPdfFileName(null)
    if (pdfInputRef.current) {
      pdfInputRef.current.value = ''
    }
    form.setValue('pdfFile', null, { shouldValidate: true, shouldDirty: true })
    form.clearErrors('pdfFile')
  }

  const removeCoverImage = () => {
    setCoverImageFileName(null)
    if (coverInputRef.current) {
      coverInputRef.current.value = ''
    }
    form.setValue('coverImage', null, { shouldValidate: true, shouldDirty: true })
    form.clearErrors('coverImage')
  }

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      // Log sanitized telemetry event without exposing file metadata
      console.log('Book upload initiated', {
        hasPdf: !!values.pdfFile,
        hasImage: !!values.coverImage,
        voice: values.voice,
      })
      // Simular llamada a API
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePdfKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pdfInputRef.current?.click()
    }
  }

  const handleCoverKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      coverInputRef.current?.click()
    }
  }

  const voiceOptions = {
    male: [
      { id: 'dave', name: 'Dave', description: 'Young male, British-Essex, casual & conversational' },
      { id: 'daniel', name: 'Daniel', description: 'Middle-aged male, British, authoritative but warm' },
      { id: 'chris', name: 'Chris', description: 'Male, casual & easy-going' },
    ],
    female: [
      { id: 'rachel', name: 'Rachel', description: 'Young female, American, calm & clear' },
      { id: 'sarah', name: 'Sarah', description: 'Young female, American, soft & approachable' },
    ],
  }

  return (
    <>
      {isSubmitting && <LoadingOverlay />}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="new-book-wrapper">
          <div className="space-y-8">
            {/* PDF File Upload */}
            <FormField
              control={form.control}
              name="pdfFile"
              render={() => (
                <FormItem>
                  <FormLabel className="form-label">Book PDF File</FormLabel>
                  <FormControl>
                    <div
                      className="upload-dropzone cursor-pointer border-2 border-dashed border-(--border-subtle) focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={() => pdfInputRef.current?.click()}
                      onKeyDown={handlePdfKeyDown}
                      role="button"
                      tabIndex={0}
                      aria-label="Upload PDF file. Press Enter or Space to open file selection dialog."
                    >
                      {!pdfFileName ? (
                        <div className="file-upload-shadow">
                          <Upload className="upload-dropzone-icon" />
                          <p className="upload-dropzone-text">Click to upload PDF</p>
                          <p className="upload-dropzone-hint">PDF file (max 50MB)</p>
                        </div>
                      ) : (
                        <div className="file-upload-shadow">
                          <p className="upload-dropzone-text">{pdfFileName}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              removePdfFile()
                            }}
                            className="mt-2"
                          >
                            <X className="upload-dropzone-remove" />
                          </button>
                        </div>
                      )}
                      <input
                        ref={pdfInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handlePdfChange}
                        className="hidden"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cover Image Upload */}
            <FormField
              control={form.control}
              name="coverImage"
              render={() => (
                <FormItem>
                  <FormLabel className="form-label">Cover Image (Optional)</FormLabel>
                  <FormControl>
                    <div
                      className="upload-dropzone cursor-pointer border-2 border-dashed border-(--border-subtle) focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={() => coverInputRef.current?.click()}
                      onKeyDown={handleCoverKeyDown}
                      role="button"
                      tabIndex={0}
                      aria-label="Upload cover image (optional). Press Enter or Space to open file selection dialog."
                    >
                      {!coverImageFileName ? (
                        <div className="file-upload-shadow">
                          <ImageIcon className="upload-dropzone-icon" />
                          <p className="upload-dropzone-text">Click to upload cover image</p>
                          <p className="upload-dropzone-hint">Leave empty to auto-generate from PDF</p>
                        </div>
                      ) : (
                        <div className="file-upload-shadow">
                          <p className="upload-dropzone-text">{coverImageFileName}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeCoverImage()
                            }}
                            className="mt-2"
                          >
                            <X className="upload-dropzone-remove" />
                          </button>
                        </div>
                      )}
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverChange}
                        className="hidden"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title Input */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="form-label">Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="ex: Rich Dad Poor Dad"
                      className="form-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Author Input */}
            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="form-label">Author Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="ex: Robert Kiyosaki"
                      className="form-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Voice Selector */}
            <FormField
              control={form.control}
              name="voice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="form-label">Choose Assistant Voice</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Male Voices */}
                      <div>
                        <p className="text-sm font-medium text-(--text-secondary) mb-3">
                          Male Voices
                        </p>
                        <div className="voice-selector-options">
                          {voiceOptions.male.map((voice) => (
                            <label
                              key={voice.id}
                              className={`voice-selector-option ${
                                field.value === voice.id
                                  ? 'voice-selector-option-selected'
                                  : 'voice-selector-option-default'
                              }`}
                            >
                              <input
                                type="radio"
                                value={voice.id}
                                checked={field.value === voice.id}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="hidden"
                              />
                              <div className="flex-1">
                                <p className="font-semibold text-(--text-primary)">
                                  {voice.name}
                                </p>
                                <p className="text-xs text-(--text-secondary)">
                                  {voice.description}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Female Voices */}
                      <div>
                        <p className="text-sm font-medium text-(--text-secondary) mb-3">
                          Female Voices
                        </p>
                        <div className="voice-selector-options">
                          {voiceOptions.female.map((voice) => (
                            <label
                              key={voice.id}
                              className={`voice-selector-option ${
                                field.value === voice.id
                                  ? 'voice-selector-option-selected'
                                  : 'voice-selector-option-default'
                              }`}
                            >
                              <input
                                type="radio"
                                value={voice.id}
                                checked={field.value === voice.id}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="hidden"
                              />
                              <div className="flex-1">
                                <p className="font-semibold text-(--text-primary)">
                                  {voice.name}
                                </p>
                                <p className="text-xs text-(--text-secondary)">
                                  {voice.description}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="form-btn"
            >
              {isSubmitting ? 'Processing...' : 'Begin Synthesis'}
            </Button>
          </div>
        </form>
      </Form>
    </>
  )
}

export default UploadForm









