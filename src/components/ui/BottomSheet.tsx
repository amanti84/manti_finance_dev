import type { FC, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export const BottomSheet: FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true)
      document.body.style.overflow = 'hidden'
      return undefined
    } else {
      const timer = setTimeout(() => {
        setIsMounted(false)
      }, 300)
      document.body.style.overflow = ''
      return () => {
        clearTimeout(timer)
      }
    }
  }, [isOpen])

  if (!isMounted && !isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`relative w-full max-h-[90vh] bg-surface rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out flex flex-col pb-[env(safe-area-inset-bottom)] ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle */}
        <div className="flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing" onClick={onClose}>
          <div className="w-12 h-1.5 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <h3 className="text-lg font-bold text-text">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text rounded-full hover:bg-bg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  )
}
