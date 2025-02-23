export function createMdxContent({
  title,
  summary,
  markdown,
  imageUrl,
  tags,
}: {
  title: string
  summary: string
  markdown: string
  imageUrl?: string
  tags: string[]
}) {
  const frontmatter = [
    "---",
    `tags: ${JSON.stringify(tags)}`,
    `authors: ['default']`,
    `date: '${new Date().toISOString().split("T")[0]}'`,
    `summary: '${summary}'`,
    `draft: true`,
    imageUrl ? `images: https://pub-29ede69a4da644b9b81fa3dd5f8e9d6a.r2.dev/${imageUrl.split("/").pop()}` : null,
    `title: '${title}'`,
    "---",
  ]
    .filter(Boolean)
    .join("\n")

  return `${frontmatter}\n\n${markdown}`
}

