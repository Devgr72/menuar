import { useState } from 'react'

interface Props {
  qrUrl: string
  restaurantName: string
  slug: string
}

export default function QRCodeDisplay({ qrUrl, restaurantName, slug }: Props) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      // Fetch as blob to force download (avoids browser opening image in new tab for cross-origin URLs)
      const res = await fetch(qrUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}-qr.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      // Fallback for cross-origin: open in new tab
      window.open(qrUrl, '_blank')
    } finally {
      // Delay slightly to ensure user sees the "Downloaded" state feel
      setTimeout(() => setDownloading(false), 800)
    }
  }

  return (
    <div className="bg-[#F8FAFC] rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-8 border border-[#F1F5F9] transition-all hover:bg-white hover:shadow-lg hover:shadow-[#1e293b05]">
      {/* QR Image */}
      <div className="flex-none bg-white rounded-3xl p-5 shadow-sm border border-[#F1F5F9] transform transition-transform group-hover:scale-105">
        <img src={qrUrl} alt="Restaurant QR code" className="w-32 h-32 object-contain" />
      </div>

      {/* Info + download */}
      <div className="flex-1 text-center sm:text-left space-y-4">
        <div>
          <h3 className="font-fraunces font-bold text-xl text-[#1E293B]">Table Engine QR</h3>
          <p className="font-outfit text-sm text-[#64748B] font-medium mt-1">
            Linked to: <span className="text-[#2C4A2C] font-semibold">{restaurantName}</span>
          </p>
        </div>
        
        <p className="font-outfit text-xs text-[#94A3B8] leading-relaxed max-w-sm">
          High-fidelity vector QR. Customers scan this to initiate the AR journey. Optimized for 300dpi print quality.
        </p>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl font-outfit font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-70 ${
            downloading 
              ? 'bg-[#1E293B] text-white' 
              : 'bg-[#2C4A2C] text-white hover:bg-[#1E293B] shadow-[#2c4a2c20]'
          }`}
        >
          {downloading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
              Preparing PNG...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download QR Code
            </>
          )}
        </button>
      </div>
    </div>
  )
}
