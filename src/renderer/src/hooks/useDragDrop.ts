import { useState, useCallback, useRef, DragEvent } from 'react'
import { useBrowserStore } from '../stores/browser.store'
import { useTransferStore } from '../stores/transfer.store'

interface DragDropResult {
  dropZoneProps: {
    onDragOver: (e: DragEvent) => void
    onDragEnter: (e: DragEvent) => void
    onDragLeave: (e: DragEvent) => void
    onDrop: (e: DragEvent) => void
  }
  isOver: boolean
}

export function useDragDrop(): DragDropResult {
  const [isOver, setIsOver] = useState(false)
  const dragCounterRef = useRef(0)

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    dragCounterRef.current++
    if (dragCounterRef.current === 1) setIsOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setIsOver(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    dragCounterRef.current = 0

    const { currentBucket, currentPrefix } = useBrowserStore.getState()
    if (!currentBucket) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const paths: string[] = []
      for (let i = 0; i < files.length; i++) {
        const path = window.api.getPathForFile(files[i])
        if (path) paths.push(path)
      }
      if (paths.length > 0) {
        const { upload } = useTransferStore.getState()
        upload(currentBucket, currentPrefix, paths)
      }
    }
  }, [])

  return {
    dropZoneProps: {
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    },
    isOver
  }
}
