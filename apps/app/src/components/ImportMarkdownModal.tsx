'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { X, Upload, FileText, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react'
import { useCampaign } from '@/contexts/AppContext'

type ImportMarkdownModalProps = {
  isOpen: boolean
  onClose: () => void
  onImport: (files: File[], campaignSlug: string) => Promise<ImportResult>
}

type ImportResult = {
  message: string
  created_notes: Array<{
    id: string
    title: string
    imported_from: string
    detected_type: string
    internal_links?: string[]
    frontmatter?: Record<string, unknown>
  }>
  errors: string[]
  total_files: number
  successful_imports: number
  failed_imports: number
}

export function ImportMarkdownModal({ isOpen, onClose, onImport }: ImportMarkdownModalProps) {
  const { campaigns, currentCampaign } = useCampaign()
  const [files, setFiles] = useState<File[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [isCampaignDropdownOpen, setIsCampaignDropdownOpen] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFiles([])
      setIsDragActive(false)
      setIsImporting(false)
      setImportResult(null)
      setIsCampaignDropdownOpen(false)
    } else {
      // Set default campaign to current one when opening
      setSelectedCampaign(currentCampaign?.slug || '')
    }
  }, [isOpen, currentCampaign?.slug])

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const markdownFiles = Array.from(selectedFiles).filter(file => 
      file.name.endsWith('.md') || file.name.endsWith('.markdown')
    )

    setFiles(prev => [...prev, ...markdownFiles])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }, [])

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleImport = async () => {
    if (files.length === 0) return
    if (!selectedCampaign) return

    setIsImporting(true)
    try {
      const result = await onImport(files, selectedCampaign)
      setImportResult(result)
    } catch (error) {
      setImportResult({
        message: 'Import failed',
        created_notes: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        total_files: files.length,
        successful_imports: 0,
        failed_imports: files.length
      })
    } finally {
      setIsImporting(false)
    }
  }

  const selectedCampaignData = campaigns.find(c => c.slug === selectedCampaign)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Import Markdown Files
          </h2>
          <button
            title="Close"
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!importResult ? (
            <>
              {/* Campaign Selector */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Import to Campaign
                </label>
                <div className="relative">
                  <button
                    onClick={() => setIsCampaignDropdownOpen(!isCampaignDropdownOpen)}
                    className="w-full flex items-center justify-between bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <span>
                      {selectedCampaignData?.title || 'Select a campaign...'}
                    </span>
                    <ChevronDown 
                      size={16} 
                      className={`text-zinc-400 transition-transform ${isCampaignDropdownOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>
                  
                  {isCampaignDropdownOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsCampaignDropdownOpen(false)}
                      />
                      
                      {/* Dropdown */}
                      <div className="absolute top-full mt-1 left-0 w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                        {campaigns.map((campaign) => (
                          <button
                            key={campaign.id}
                            onClick={() => {
                              setSelectedCampaign(campaign.slug)
                              setIsCampaignDropdownOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                              selectedCampaign === campaign.slug
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                                : 'text-zinc-900 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                            }`}
                          >
                            {campaign.title}
                          </button>
                        ))}
                        {campaigns.length === 0 && (
                          <div className="px-3 py-2 text-sm text-zinc-500">
                            No campaigns available
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* File Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onKeyDown={handleKeyDown}
              >
                <Upload className="mx-auto mb-4 text-zinc-400" size={48} />
                <p className="text-zinc-600 dark:text-zinc-300 mb-2">
                  Drag and drop markdown files here, or{' '}
                  <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                    browse
                    <input
                      type="file"
                      multiple
                      accept=".md,.markdown"
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                    />
                  </label>
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Supports .md and .markdown files
                </p>
              </div>

              {/* Selected Files List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                    Selected Files ({files.length})
                  </h3>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded"
                      >
                        <div className="flex items-center space-x-2">
                          <FileText size={16} className="text-zinc-500" />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                            {file.name}
                          </span>
                          <span className="text-xs text-zinc-500">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                          title="Remove file"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Import Features:</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Automatic title extraction from H1 headers or filenames</li>
                    <li>YAML frontmatter support for metadata</li>
                    <li>Note type detection based on content patterns</li>
                    <li>Internal link detection for future relationships</li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            /* Import Results */
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {importResult.failed_imports === 0 ? (
                  <CheckCircle className="text-green-500" size={24} />
                ) : (
                  <AlertCircle className="text-yellow-500" size={24} />
                )}
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  Import Complete
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {importResult.successful_imports}
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-300">
                    Successful
                  </div>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {importResult.failed_imports}
                  </div>
                  <div className="text-sm text-red-800 dark:text-red-300">
                    Failed
                  </div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {importResult.total_files}
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    Total
                  </div>
                </div>
              </div>

              {importResult.created_notes.length > 0 && (
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                    Created Notes:
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.created_notes.map((note, index) => (
                      <div
                        key={index}
                        className="p-2 bg-green-50 dark:bg-green-900/20 rounded"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-800 dark:text-green-300">
                            {note.title || note.imported_from}
                          </span>
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {note.detected_type}
                          </span>
                        </div>
                        {note.internal_links && note.internal_links.length > 0 && (
                          <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                            Links: {note.internal_links.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                    Errors:
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.map((error, index) => (
                      <div
                        key={index}
                        className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-800 dark:text-red-300"
                      >
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            {!importResult ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={files.length === 0 || !selectedCampaign || isImporting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed rounded-md"
                  title={!selectedCampaign ? 'Please select a campaign first' : ''}
                >
                  {isImporting ? 'Importing...' : `Import ${files.length} File${files.length !== 1 ? 's' : ''}`}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}