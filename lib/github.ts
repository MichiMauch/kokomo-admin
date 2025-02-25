"use server"

import { createMdxContent } from "./mdx"
import matter from "gray-matter"

interface CommitMdxOptions {
  title: string
  summary: string
  markdown: string
  tags: string[]
  imageUrl?: string
}

export interface GitHubContent {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string
  type: string
  date?: string
  title?: string
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER;
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const GITHUB_PATH = process.env.GITHUB_PATH || "data/tiny-house";

if (!GITHUB_TOKEN || !GITHUB_REPO_OWNER || !GITHUB_REPO_NAME) {
  throw new Error("GitHub Konfiguration unvollständig");
}

const cache: { [key: string]: { data: any; timestamp: number } } = {};

export async function checkRepoAccess(): Promise<boolean> {
  const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  return response.ok;
}

export async function fetchGitHubContents(
  path: string = GITHUB_PATH
): Promise<GitHubContent[]> {
  const cacheKey = `contents_${path}`;
  const cached = cache[cacheKey];
  const now = Date.now();

  if (cached && now - cached.timestamp < 5 * 60 * 1000) {
    return cached.data;
  }

  const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${path}?ref=${GITHUB_BRANCH}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
    next: { revalidate: 60 }, // Cache für 60 Sekunden
  });

  if (!response.ok) {
    console.error(
      `GitHub API error: ${response.status} ${response.statusText}`
    );
    console.error(`URL: ${url}`);
    const errorBody = await response.text();
    console.error(`Error body: ${errorBody}`);
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  cache[cacheKey] = { data, timestamp: now };
  return data;
}

export async function fetchFileContent(path: string): Promise<string> {
  const cacheKey = `file_${path}`;
  const cached = cache[cacheKey];
  const now = Date.now();

  if (cached && now - cached.timestamp < 5 * 60 * 1000) {
    return cached.data;
  }

  const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${path}?ref=${GITHUB_BRANCH}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    console.error(
      `GitHub API error: ${response.status} ${response.statusText}`
    );
    console.error(`URL: ${url}`);
    const errorBody = await response.text();
    console.error(`Error body: ${errorBody}`);
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`
    );
  }

  const file = await response.json();
  const content = Buffer.from(file.content, 'base64').toString('utf-8');
  cache[cacheKey] = { data: content, timestamp: now };
  return content;
}

export async function extractFrontmatter(content: string) {
  const { data } = matter(content);
  return {
    title: data.title || "",
    summary: data.summary || "",
    tags: data.tags || [],
    date: data.date || "",
  };
}

export async function fetchAllMdxFiles(): Promise<GitHubContent[]> {
  const contents = await fetchGitHubContents();
  const mdxFiles = contents.filter((item) => item.type === "file" && isMdxFile(item.name));
  const filesWithFrontmatter = await Promise.all(
    mdxFiles.map(async (file) => {
      const content = await fetchFileContent(file.path);
      const frontmatter = await extractFrontmatter(content);
      return {
        ...file,
        date: frontmatter.date,
        title: frontmatter.title,
      };
    })
  );
  return filesWithFrontmatter;
}

function isMdxFile(filename: string): boolean {
  return filename.endsWith(".mdx") || filename.endsWith(".md");
}

export async function commitMdxToGithub(options: CommitMdxOptions) {
  try {
    // MDX Content erstellen
    const content = await createMdxContent({
      title: options.title,
      summary: options.summary,
      markdown: options.markdown,
      imageUrl: options.imageUrl,
      tags: options.tags,
    });

    // Dateiname generieren
    const filename = `${GITHUB_PATH}/${options.title.toLowerCase().replace(/\s+/g, "-")}.mdx`;

    // Base64 encode content
    const contentBase64 = Buffer.from(content).toString("base64");

    // Aktuelle SHA des Files abrufen (falls es existiert)
    const currentFileResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${filename}?ref=${GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    let sha: string | undefined;
    if (currentFileResponse.status === 200) {
      const currentFile = await currentFileResponse.json();
      sha = currentFile.sha;
    }

    // File committen
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${filename}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Add/Update post: ${options.title}`,
        content: contentBase64,
        branch: GITHUB_BRANCH,
        sha, // Wird nur gesendet wenn die Datei bereits existiert
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub API Error: ${error.message}`);
    }

    const result = await response.json();

    return {
      success: true,
      url: result.content.html_url,
      message: `MDX erfolgreich zu GitHub committed: ${filename}`,
    };
  } catch (error) {
    console.error("GitHub commit error:", error);
    return {
      success: false,
      message: `Fehler beim Commit: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
    };
  }
}
