import { useState } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { Upload, AlertCircle, X } from 'lucide-react'

export function ImportButton() {
  const { importQuizzes, importError } = useQuizStore()
  const [isLoading, setIsLoading] = useState(false)
  const [showError, setShowError] = useState(false)

  const handleImport = async () => {
    setIsLoading(true)
    setShowError(false)

    try {
      const result = await window.electronAPI.importQuizFile()

      if (result.success && result.data) {
        const success = await importQuizzes(result.data)
        if (!success) {
          setShowError(true)
        }
      } else if (result.error && result.error !== 'cancelled') {
        setShowError(true)
      }
    } catch (error) {
      console.error('Import failed:', error)
      setShowError(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleImport}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2 text-sm border rounded-lg transition-colors ${
          isLoading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-200 text-claude-gray hover:bg-gray-50 hover:text-claude-dark'
        }`}
      >
        <Upload className="w-4 h-4" />
        {isLoading ? 'インポート中...' : 'JSONをインポート'}
      </button>

      {/* Error message */}
      {showError && importError && (
        <div className="max-w-md p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-700 mb-1">インポートエラー</p>
              <pre className="text-xs text-red-600 whitespace-pre-wrap font-mono">
                {importError}
              </pre>
            </div>
            <button
              onClick={() => setShowError(false)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
