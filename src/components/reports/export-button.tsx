"use client"

import React from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pdf } from '@react-pdf/renderer'
import { TacticalDossier } from './tactical-dossier'

interface ExportButtonProps {
  data: any
  fileName: string
  variant?: "ghost" | "outline" | "default"
  className?: string
  showText?: boolean
  label?: string
  disabled?: boolean
}

export function ExportButton({ data, fileName, variant = "outline", className, showText = false, label = "Export Intelligence", disabled }: ExportButtonProps) {
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleDownload = async () => {
    try {
      setIsGenerating(true)
      // Imperative generation avoids some reconciler-during-render issues in React 19
      const doc = <TacticalDossier data={data} />
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("PDF Generation Error:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isMounted) return null

  return (
    <Button 
      variant={variant} 
      size={showText ? "sm" : "icon"} 
      className={className} 
      onClick={handleDownload}
      disabled={isGenerating || disabled}
    >
      <Download className={`h-4 w-4 ${isGenerating ? 'animate-pulse' : ''} ${showText ? 'mr-2' : ''}`} />
      {showText && (isGenerating ? 'Generating...' : label)}
    </Button>
  )
}
