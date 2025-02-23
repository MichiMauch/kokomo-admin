"use server"

import { createMdxContent } from "./mdx"

interface CommitMdxOptions {
  title: string
  summary: string
  markdown: string
  tags: string[]
  imageUrl?: string
}

export async function commitMdxToGithub(options: CommitMdxOptions) {
  try {
    const token = process.env.GITHUB_TOKEN
    const owner = process.env.GITHUB_REPO_OWNER
    const repo = process.env.GITHUB_REPO_NAME
    const branch = process.env.GITHUB_REPO_BRANCH || "main"

    if (!token || !owner || !repo) {
      throw new Error("GitHub Konfiguration unvollständig")
    }

    // MDX Content erstellen
    const content = createMdxContent(options)

    // Dateiname generieren
    const filename = `data/tiny-house/${options.title.toLowerCase().replace(/\s+/g, "-")}.mdx`

    // Base64 encode content
    const contentBase64 = Buffer.from(content).toString("base64")

    // Aktuelle SHA des Files abrufen (falls es existiert)
    const currentFileResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filename}?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    )

    let sha: string | undefined
    if (currentFileResponse.status === 200) {
      const currentFile = await currentFileResponse.json()
      sha = currentFile.sha
    }

    // File committen
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filename}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Add/Update post: ${options.title}`,
        content: contentBase64,
        branch,
        sha, // Wird nur gesendet wenn die Datei bereits existiert
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`GitHub API Error: ${error.message}`)
    }

    const result = await response.json()

    return {
      success: true,
      url: result.content.html_url,
      message: `MDX erfolgreich zu GitHub committed: ${filename}`,
    }
  } catch (error) {
    console.error("GitHub commit error:", error)
    return {
      success: false,
      message: `Fehler beim Commit: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
    }
  }
}

