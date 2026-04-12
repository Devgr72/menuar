interface Props {
  qrUrl: string
  restaurantName: string
  slug: string
}

export default function QRCodeDisplay({ qrUrl, restaurantName, slug }: Props) {
  function handleDownload() {
    // Fetch as blob to force download (avoids browser opening image in new tab for cross-origin URLs)
    fetch(qrUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${slug}-qr.png`
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch(() => {
        // Fallback for cross-origin: open in new tab
        window.open(qrUrl, '_blank')
      })
  }

  return (
    <div
      className="rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-6"
      style={{ background: '#FEFCF7', border: '1px solid #E8DDBF' }}
    >
      {/* QR Image */}
      <div
        className="flex-none rounded-2xl p-3 shadow-sm"
        style={{ background: '#fff', border: '1px solid #E8DDBF' }}
      >
        <img src={qrUrl} alt="Restaurant QR code" className="w-36 h-36 object-contain" />
      </div>

      {/* Info + download */}
      <div className="flex-1 text-center sm:text-left">
        <h3 className="font-fraunces font-semibold text-base mb-1" style={{ color: '#1C1C1A' }}>
          Your Table QR Code
        </h3>
        <p className="font-dm-sans text-sm mb-1" style={{ color: '#7A6B55' }}>
          {restaurantName}
        </p>
        <p className="font-dm-sans text-xs mb-4 leading-relaxed" style={{ color: '#B8A882' }}>
          Place on tables or the entrance. Customers scan to view your dishes in AR — no app needed.
        </p>

        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-dm-sans font-semibold text-sm transition-all active:scale-[0.97]"
          style={{ background: '#2B4A2B', color: '#F5F0E8' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13m0 0l-4-4m4 4l4-4M3 21h18" />
          </svg>
          Download PNG
        </button>
      </div>
    </div>
  )
}
