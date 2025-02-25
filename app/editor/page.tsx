"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  fetchFileContent,
  extractFrontmatter,
  commitMdxToGithub,
} from "@/lib/github";
import { MarkdownEditor } from "@/components/markdown-editor";

interface Content {
  title: string;
  summary: string;
  markdown: string;
  tags: string[];
}

export default function EditorPage() {
  const router = useRouter();
  const { path } = router.query;
  const [content, setContent] = useState<Content>({
    title: "",
    summary: "",
    markdown: "",
    tags: [],
  });

  useEffect(() => {
    if (path) {
      (async () => {
        const fileContent = await fetchFileContent(path as string);
        const frontmatter = await extractFrontmatter(fileContent);
        setContent({
          title: frontmatter.title,
          summary: frontmatter.summary,
          markdown: fileContent,
          tags: frontmatter.tags,
        });
      })();
    }
  }, [path]);

  const handleContentChange = (updatedContent: Content) => {
    setContent(updatedContent);
  };

  const handleSave = async () => {
    await commitMdxToGithub({
      title: content.title,
      summary: content.summary,
      markdown: content.markdown,
      tags: content.tags,
    });
    router.push("/content");
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Markdown Editor</h1>
      <MarkdownEditor
        onContentChange={handleContentChange}
        initialContent={content}
      />
      <button
        onClick={handleSave}
        className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
      >
        Speichern
      </button>
    </div>
  );
}
