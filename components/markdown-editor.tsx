"use client"

import type React from "react"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

// Dynamically import the editor to avoid SSR issues
const MdEditor = dynamic(() => import("react-markdown-editor-lite"), {
  ssr: false,
})

// Import the editor styles
import "react-markdown-editor-lite/lib/index.css"

interface MarkdownEditorProps {
  onContentChange: (content: {
    title: string
    summary: string
    markdown: string
    tags: string[]
  }) => void
  initialContent?: {
    title?: string
    summary?: string
    markdown?: string
    tags?: string[]
  }
}

export function MarkdownEditor({ onContentChange, initialContent }: MarkdownEditorProps) {
  const [title, setTitle] = useState(initialContent?.title || "")
  const [summary, setSummary] = useState(initialContent?.summary || "")
  const [markdown, setMarkdown] = useState(initialContent?.markdown || "")
  const [tagsInput, setTagsInput] = useState(initialContent?.tags?.join(", ") || "")

  // Update local state when initialContent changes
  useEffect(() => {
    if (initialContent) {
      setTitle(initialContent.title || "")
      setSummary(initialContent.summary || "")
      setMarkdown(initialContent.markdown || "")
      setTagsInput(initialContent.tags?.join(", ") || "")
    }
  }, [initialContent])

  const handleEditorChange = ({ text }: { text: string }) => {
    setMarkdown(text)
    updateContent(text, tagsInput, title, summary)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    updateContent(markdown, tagsInput, newTitle, summary)
  }

  const handleSummaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSummary = e.target.value
    setSummary(newSummary)
    updateContent(markdown, tagsInput, title, newSummary)
  }

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTags = e.target.value
    setTagsInput(newTags)
    updateContent(markdown, newTags, title, summary)
  }

  const updateContent = (
    currentMarkdown: string,
    currentTags: string,
    currentTitle: string,
    currentSummary: string,
  ) => {
    // Verarbeite die Tags: Trenne bei Komma, entferne Leerzeichen am Anfang/Ende
    // und filtere leere Tags heraus
    const tags = currentTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    onContentChange({
      title: currentTitle,
      summary: currentSummary,
      markdown: currentMarkdown,
      tags,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Titel</Label>
          <Input id="title" placeholder="Titel des Beitrags" value={title} onChange={handleTitleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="summary">Zusammenfassung</Label>
          <Input id="summary" placeholder="Kurze Zusammenfassung" value={summary} onChange={handleSummaryChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (kommagetrennt)</Label>
          <Input id="tags" placeholder="tag1, tag2, tag3" value={tagsInput} onChange={handleTagsChange} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Inhalt</Label>
        <div className="border rounded-md">
          <MdEditor
            value={markdown}
            style={{ height: "400px" }}
            renderHTML={(text) => text}
            onChange={handleEditorChange}
            placeholder="Markdown Text hier eingeben..."
            view={{ menu: true, md: true, html: false }}
          />
        </div>
      </div>
    </div>
  )
}

