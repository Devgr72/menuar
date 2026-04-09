interface Props {
  qrUrl: string
  restaurantName: string
  slug: string
}

export default function QRCodeDisplay({ qrUrl, restaurantName, slug }: Props) {
  function handleDownload() {
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `${slug}-qr.png`
    a.click()
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center gap-4">
      <h2 className="text-base font-semibold text-white self-start">Your QR Code</h2>

      <div className="bg-white rounded-xl p-3">
        <img src={qrUrl} alt="Restaurant QR code" className="w-40 h-40 object-contain" />
      </div>

      <p className="text-gray-400 text-xs text-center">
        Place this QR on your tables or menu.<br />
        Customers scan it to see your dishes in AR.
      </p>

      <div className="flex gap-3 w-full">
        <button
          onClick={handleDownload}
          className="flex-1 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
        >
          Download PNG
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/ar/${slug}`)}
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl py-2.5 transition-colors"
        >
          Copy Link
        </button>
      </div>

      <p className="text-gray-600 text-xs">{restaurantName}</p>
    </div>
  )
}
