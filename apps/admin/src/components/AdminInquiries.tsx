'use client'

import { useState } from 'react'
import { useAdminInquiries, type InquiryFilter } from '../hooks/useAdmin'
import { updateInquiryStatus } from '../api/client'
import type { Inquiry, InquiryStatus } from '@menuar/types'

const FILTERS: { id: InquiryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'contact', label: 'Contact form' },
  { id: 'newsletter', label: 'Newsletter' },
]

const STATUS_STYLE: Record<InquiryStatus, string> = {
  new: 'bg-orange-100 text-orange-700 border-orange-200',
  read: 'bg-blue-50 text-blue-600 border-blue-100',
  archived: 'bg-gray-100 text-gray-500 border-gray-200',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminInquiries({ token }: { token: string }) {
  const [filter, setFilter] = useState<InquiryFilter>('all')
  const { inquiries, total, loading, refetch } = useAdminInquiries(token, filter)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function setStatus(inquiry: Inquiry, status: InquiryStatus) {
    setBusyId(inquiry.id)
    try {
      await updateInquiryStatus(token, inquiry.id, status)
      await refetch(1)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                filter === f.id
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => refetch(1)}
          className="text-xs font-bold px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 text-sm mt-3">Loading inquiries...</p>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3 border border-gray-100">
              <span className="text-3xl">📥</span>
            </div>
            <span className="text-gray-600 font-semibold">No inquiries yet</span>
            <span className="text-gray-400 text-sm mt-1">
              Contact form messages and newsletter sign-ups will appear here
            </span>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {inquiries.map((item) => {
              const isContact = item.type === 'contact'
              const isOpen = expanded === item.id
              return (
                <li key={item.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${STATUS_STYLE[item.status]}`}
                        >
                          {item.status}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-600 border border-gray-200">
                          {isContact ? 'Contact' : 'Newsletter'}
                        </span>
                        <span className="text-gray-400 text-xs">{formatDate(item.createdAt)}</span>
                      </div>

                      <p className="mt-2 font-bold text-gray-900 truncate">
                        {isContact ? item.subject : 'Newsletter subscription'}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5 truncate">
                        {item.name ? `${item.name} · ` : ''}
                        <a href={`mailto:${item.email}`} className="text-orange-600 hover:underline">
                          {item.email}
                        </a>
                        {item.phone ? ` · ${item.phone}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isContact && (
                        <button
                          onClick={() => setExpanded(isOpen ? null : item.id)}
                          className="text-xs font-bold px-3 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          {isOpen ? 'Hide' : 'View'}
                        </button>
                      )}
                      {item.status !== 'read' && (
                        <button
                          disabled={busyId === item.id}
                          onClick={() => setStatus(item, 'read')}
                          className="text-xs font-bold px-3 py-1.5 border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                        >
                          Mark read
                        </button>
                      )}
                      {item.status !== 'archived' && (
                        <button
                          disabled={busyId === item.id}
                          onClick={() => setStatus(item, 'archived')}
                          className="text-xs font-bold px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && item.message && (
                    <div className="mt-3 bg-orange-50/60 border border-orange-100 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                      {item.message}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {total > 0 && (
        <p className="text-gray-400 text-xs text-center">
          Showing {inquiries.length} of {total}
        </p>
      )}
    </div>
  )
}
