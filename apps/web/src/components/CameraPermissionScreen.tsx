import React from 'react';

interface Props {
  onRequestPermission: () => void;
}

export default function CameraPermissionScreen({ onRequestPermission }: Props) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-2xl shadow-xl flex flex-col items-center border border-gray-700">
        <div className="w-20 h-20 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-4">Camera Access Needed</h2>
        <p className="text-gray-400 mb-8 leading-relaxed">
          We need access to your camera to show you dishes in 3D floating right on your physical table. No app download required!
        </p>
        <button
          onClick={onRequestPermission}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-lg"
        >
          Allow Camera
        </button>
      </div>
    </div>
  );
}
