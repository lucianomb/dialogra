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
import {useAuth} from "@clerk/clerk-react";
import {toast} from "sonner";
import {checkBookExists, createBook, saveBookSegments} from "@/lib/actions/book.actions";
import {useRouter} from "next/navigation";
import { validatePDFFile, validateCoverImage } from "@/lib/utils"
import { parsePDFFile } from "@/lib/pdf-client"
import {upload} from "@vercel/blob/client";

// Validation Schema
const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  author: z.string().min(1, 'Author name is required').max(100, 'Author name is too long'),
  persona: z.string().min(1, 'Please select a voice'),
  pdfFile: z.instanceof(File).superRefine((file: File, ctx) => {
    const validation = validatePDFFile(file);
    if (!validation.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: validation.error || 'Invalid PDF file',
      });
    }
  }),
  coverImage: z.instanceof(File).optional().superRefine((file: File | undefined, ctx) => {
    const validation = validateCoverImage(file);
    if (!validation.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: validation.error || 'Invalid cover image',
      });
    }
  }),
})

type FormValues = z.infer<typeof formSchema>

const UploadForm = () => {
  const [pdfFileName, setPdfFileName] = useState<string | null>(null)
  const [coverImageFileName, setCoverImageFileName] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const pdfInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const { userId } = useAuth();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      author: '',
      persona: '',
      pdfFile: undefined,
      coverImage: undefined,
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
    form.resetField('pdfFile')
  }

  const removeCoverImage = () => {
    setCoverImageFileName(null)
    if (coverInputRef.current) {
      coverInputRef.current.value = ''
    }
    form.resetField('coverImage')
  }

  const onSubmit = async (values: FormValues) => {
    if (!userId) {
      return toast.error('Please log in to upload books');
    }

    setIsSubmitting(true)

    // PostHog -> Track Book Uploads...

    try {
      const existsCheck = await checkBookExists(values.title);
      if (existsCheck.exists && existsCheck.book) {
        toast.info('Book with the same title already exists.');
        form.reset();
        router.push(`/books/${existsCheck.book.slug}`);
        return;
      }

      const fileTitle = values.title.replace(/\s+/g, '-').toLowerCase();
      const pdfFile = values.pdfFile;

      const parsedPDF = await parsePDFFile(pdfFile);

      if (parsedPDF.content.length === 0) {
        toast.error('PDF is empty. Please upload a valid PDF file.');
        return;
      }

      const uploadedPdfBlob = await upload(fileTitle, pdfFile, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        contentType: 'application/pdf',
      })

      let coverUrl: string;

      if (values.coverImage) {
        const uploadedCoverBlob = await upload(`${fileTitle}_cover.png`, values.coverImage, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          contentType: values.coverImage.type,
        });
        coverUrl = uploadedCoverBlob.url;
      } else {
        const response = await fetch(parsedPDF.cover)
        const blob = await response.blob();

        const uploadedCoverBlob = await upload(`${fileTitle}_cover.png`, blob, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          contentType: blob.type,
        });
        coverUrl = uploadedCoverBlob.url;
      }

      const book = await createBook({
        clerkId: userId,
        title: values.title,
        author: values.author,
        persona: values.persona,
        fileURL: uploadedPdfBlob.url,
        fileBlobKey: uploadedPdfBlob.pathname,
        coverURL: coverUrl,
        fileSize: pdfFile.size
      });

      if (!book.success) {
        if ('isBillingError' in book && book.isBillingError) {
          toast.error(book.error || 'Book limit reached. Please upgrade your plan.');
          router.push('/subscriptions');
          return;
        }

        toast.error(typeof book.error === 'string' ? book.error : 'Failed to create book.');
        return;
      }

      if (book.alreadyExists) {
        toast.info('Book with the same title already exists.');
        form.reset();
        router.push(`/books/${book.data.slug}`);
        return;
      }

      const segments = await saveBookSegments(book.data._id, userId, parsedPDF.content);

      if (!segments.success) {
        toast.error('Failed to save book segments');
        return;
      }

      form.reset();
      router.push(`/`);
    } catch (error) {
      console.error('Error submitting form:', error)

      toast.error('Error submitting form. Please try again later.');
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
              name="persona"
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









