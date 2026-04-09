import { useState, useRef } from 'react'
import { useAuth } from '@clerk/react'
import { uploadSlotPhotos } from '../../api/client'
import type { DishSlot } from '@menuar/types'

interface Props {
  slot: DishSlot
  onClose: () => void
  onSuccess: (updated: { slotNumber: number; status: string }) => void
}

type Step = 'instructions' | 'upload'

const PHOTO_TIPS = [
  { icon: '📸', label: 'Front view', desc: 'Straight-on shot of the dish' },
  { icon: '↗️', label: 'Side angle', desc: '45° angle to show depth' },
  { icon: '⬆️', label: 'Top down', desc: 'Bird\'s eye view from above' },
  { icon: '🔍', label: 'Close-up', desc: 'Texture and detail shot' },
]

export default function DishPhotoUploadModal({ slot, onClose, onSuccess }: Props) {
  const { getToken } = useAuth()
  const [step, setStep] = useState<Step>('instructions')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(selected: FileList | null) {
    if (!selected) return
    const arr = Array.from(selected).slice(0, 4)

    // Client-side size check
    const oversized = arr.find((f) => f.size > 10 * 1024 * 1024)
    if (oversized) {
      setError(`${oversized.name} is too large. Max 10MB per photo.`)
      return
    }

    setFiles(arr)
    setPreviews(arr.map((f) => URL.createObjectURL(f)))
    setError(null)
  }

  async function handleUpload() {
    if (files.length === 0) {
      setError('Please select at least 1 photo.')
      return
    }
    setUploading(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const result = await uploadSlotPhotos(token, slot.slotNumber, files)
      onSuccess({ slotNumber: result.slotNumber, status: result.status })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-white font-semibold">
            {step === 'instructions' ? 'How to photograph your dish' : `Upload photos — Slot ${slot.slotNumber}`}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'instructions' && (
          <div className="p-5 space-y-5">
            <p className="text-gray-400 text-sm">
              For the best 3D model quality, take <strong className="text-white">4 photos</strong> of your dish from different angles:
            </p>

            <div className="grid grid-cols-2 gap-3">
              {PHOTO_TIPS.map((tip) => (
                <div key={tip.label} className="bg-gray-800 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">{tip.icon}</div>
                  <div className="text-white text-sm font-medium">{tip.label}</div>
                  <div className="text-gray-500 text-xs mt-1">{tip.desc}</div>
                </div>
              ))}
            </div>

            <div className="bg-orange-900/20 border border-orange-800/40 rounded-xl p-4">
              <p className="text-orange-300 text-xs">
                <strong>Tips:</strong> Use natural lighting, clean background (white plate or plain surface). Avoid blurry or dark images.
              </p>
            </div>

            <button
              onClick={() => setStep('upload')}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl py-3 transition-colors"
            >
              Got it — Upload Photos
            </button>
          </div>
        )}

        {step === 'upload' && (
          <div className="p-5 space-y-4">
            {/* File drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-orange-600 transition-colors"
            >
              <div className="text-3xl mb-2">📷</div>
              <p className="text-gray-300 text-sm font-medium">Click to select photos</p>
              <p className="text-gray-600 text-xs mt-1">Up to 4 images · Max 10MB each</p>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            {/* Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-800">
                    <img src={src} className="w-full h-full object-cover" alt={`photo ${i + 1}`} />
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs text-center py-0.5">
                      {i + 1}/{previews.length}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('instructions')}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl py-3 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-900 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl py-3 transition-colors"
              >
                {uploading ? 'Uploading...' : `Upload ${files.length > 0 ? files.length : ''} Photo${files.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
