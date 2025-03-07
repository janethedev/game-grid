"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface TextEditDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  defaultValue: string
  onSave: (text: string) => void
}

export function TextEditDialog({
  isOpen,
  onOpenChange,
  title,
  defaultValue,
  onSave,
}: TextEditDialogProps) {
  const [text, setText] = useState(defaultValue)

  // 当对话框打开或默认值变化时更新文本
  useEffect(() => {
    setText(defaultValue)
  }, [defaultValue, isOpen])

  const handleSave = () => {
    onSave(text)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave()
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
