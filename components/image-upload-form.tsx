"use client";

import type React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { Upload, ImageIcon, Loader2, Crosshair } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadToR2 } from "@/lib/actions";
import { MarkdownEditor } from "./markdown-editor";
import { createMdxContent } from "@/lib/mdx";
import { Input } from "@/components/ui/input";
import { commitMdxToGithub } from "@/lib/github";

interface StatusType {
  message: string;
  type: "success" | "error" | "info" | null;
  details?: string;
}

interface Point {
  x: number;
  y: number;
}

interface MdxContent {
  title: string;
  summary: string;
  markdown: string;
  tags: string[];
}

interface UploadedImage {
  url: string;
  filename: string;
}

const calculateSafeFocalPoint = (
  point: Point,
  imgWidth: number,
  imgHeight: number,
  frameWidth: number,
  frameHeight: number
) => {
  // Berechne die Skalierung mit Überlappung
  const scale = Math.max(frameWidth / imgWidth, frameHeight / imgHeight) * 1.02;
  const scaledWidth = imgWidth * scale;
  const scaledHeight = imgHeight * scale;

  // Berechne die sicheren Grenzen für den Focal Point
  const xMin = frameWidth / 2 / scaledWidth;
  const xMax = 1 - frameWidth / 2 / scaledWidth;
  const yMin = frameHeight / 2 / scaledHeight;
  const yMax = 1 - frameHeight / 2 / scaledHeight;

  // Stelle sicher, dass der Punkt innerhalb der sicheren Grenzen liegt
  const safeX = Math.max(xMin, Math.min(xMax, point.x));
  const safeY = Math.max(yMin, Math.min(yMax, point.y));

  return {
    x: safeX,
    y: safeY,
  };
};

export function ImageUploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<StatusType>({ message: "", type: null });
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [focalPoint, setFocalPoint] = useState<Point | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [mdxContent, setMdxContent] = useState<MdxContent>({
    title: "",
    summary: "",
    markdown: "",
    tags: [],
  });
  const [additionalFiles, setAdditionalFiles] = useState<FileList | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [baseName, setBaseName] = useState("");
  const [isUploadingAdditional, setIsUploadingAdditional] = useState(false);

  // Funktion zum Herunterladen des MDX-Files
  const handleGithubCommit = async () => {
    if (!mdxContent.title) {
      setStatus({
        message: "Bitte geben Sie einen Titel ein",
        type: "error",
      });
      return;
    }

    setStatus({
      message: "Committe zu GitHub...",
      type: "info",
    });

    const result = await commitMdxToGithub({
      ...mdxContent,
      imageUrl: uploadedUrl || undefined,
    });

    setStatus({
      message: result.message,
      type: result.success ? "success" : "error",
      details: result.url,
    });
  };

  // Add new function for final download
  const handleFinalDownload = useCallback(() => {
    const content = createMdxContent({
      ...mdxContent,
      imageUrl: uploadedUrl || undefined,
    });

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mdxContent.title.toLowerCase().replace(/\s+/g, "-")}.mdx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [mdxContent, uploadedUrl]);

  useEffect(() => {
    // Reset focal point when switching between image types
    if (!focalPoint && imageRef.current) {
      // Set default focal point to center when switching to title image
      setFocalPoint({
        x: 0.5,
        y: 0.5,
      });
    }
  }, [focalPoint]);

  useEffect(() => {
    if (selectedFile) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let finalWidth = img.width;
        let finalHeight = img.height;

        // Always use title image ratio (1.94:1)
        const targetAspectRatio = 1.94;
        const currentAspectRatio = img.width / img.height;

        if (currentAspectRatio > targetAspectRatio) {
          finalWidth = Math.round(img.height * targetAspectRatio);
        } else {
          finalHeight = Math.round(img.width / targetAspectRatio);
        }

        canvas.width = finalWidth;
        canvas.height = finalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, finalWidth, finalHeight);

        const fp = focalPoint || { x: 0.5, y: 0.5 };

        // Berechne die Position so, dass das Bild den Canvas komplett ausfüllt
        const scale =
          Math.max(finalWidth / img.width, finalHeight / img.height) * 1.04; // 4% Überlappung für sicheren Rand
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;

        // Berechne die Position basierend auf dem Focal Point
        const x = (finalWidth - scaledWidth) * fp.x;
        const y = (finalHeight - scaledHeight) * fp.y;

        // Stelle sicher, dass das Bild den gesamten Canvas bedeckt
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

        setPreviewUrl(canvas.toDataURL("image/webp"));
        setImageDimensions({ width: finalWidth, height: finalHeight });
      };
      img.src = URL.createObjectURL(selectedFile);
    }
  }, [selectedFile, focalPoint]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !imageDimensions) return;

    const rect = imageRef.current.getBoundingClientRect();
    const frameHeight = rect.width / 1.94; // Aspect ratio 1.94:1

    // Berechne die relative Position innerhalb des Bildes
    const rawPoint = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };

    // Berechne den sicheren Focal Point
    const safePoint = calculateSafeFocalPoint(
      rawPoint,
      imageDimensions.width,
      imageDimensions.height,
      imageDimensions.width,
      frameHeight
    );

    setFocalPoint(safePoint);
  };

  // Funktion zur WebP-Konvertierung im Browser
  const convertToWebP = useCallback(
    async (file: File): Promise<{ blob: Blob; filename: string }> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let finalWidth = img.width;
          let finalHeight = img.height;

          // Always use title image ratio (1.94:1)
          const targetAspectRatio = 1.94;
          const currentAspectRatio = img.width / img.height;

          if (currentAspectRatio > targetAspectRatio) {
            finalWidth = Math.round(img.height * targetAspectRatio);
          } else {
            finalHeight = Math.round(img.width / targetAspectRatio);
          }

          canvas.width = finalWidth;
          canvas.height = finalHeight;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context nicht verfügbar"));
            return;
          }

          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, finalWidth, finalHeight);

          const fp = focalPoint || { x: 0.5, y: 0.5 };

          // Berechne die Position so, dass das Bild den Canvas komplett ausfüllt
          const scale =
            Math.max(finalWidth / img.width, finalHeight / img.height) * 1.04; // 4% Überlappung
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;

          // Berechne die Position basierend auf dem Focal Point
          const x = (finalWidth - scaledWidth) * fp.x;
          const y = (finalHeight - scaledHeight) * fp.y;

          // Stelle sicher, dass das Bild den gesamten Canvas bedeckt
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const filename = `${file.name.replace(/\.[^/.]+$/, "")}.webp`;
                resolve({ blob, filename });
              } else {
                reject(new Error("WebP-Konvertierung fehlgeschlagen"));
              }
            },
            "image/webp",
            0.8
          );
        };

        img.onerror = () =>
          reject(new Error("Bilddatei konnte nicht geladen werden"));
        img.src = URL.createObjectURL(file);
      });
    },
    [focalPoint]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Überprüfe ob es sich um ein Bild handelt
      if (!file.type.startsWith("image/")) {
        setStatus({
          message: "Fehler: Bitte nur Bilddateien auswählen",
          type: "error",
        });
        setSelectedFile(null);
        setPreview(null);
        setPreviewUrl(null);
        e.target.value = "";
        return;
      }

      // Überprüfe ob die Dateigröße unter 10MB ist
      if (file.size > 10 * 1024 * 1024) {
        setStatus({
          message: "Fehler: Datei ist zu groß (Maximum 10MB)",
          type: "error",
        });
        setSelectedFile(null);
        setPreview(null);
        setPreviewUrl(null);
        e.target.value = "";
        return;
      }

      // Erstelle eine Vorschau
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setSelectedFile(file);
      setStatus({ message: "", type: null });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setStatus({
        message: "Bitte wähle eine Datei aus",
        type: "error",
      });
      return;
    }

    setIsUploading(true);
    setUploadedUrl(null);
    const selectedBucketName = process.env.NEXT_PUBLIC_CLOUDFLARE_BUCKET_1;

    setStatus({
      message: `Upload wird vorbereitet...`,
      type: "info",
    });

    try {
      // Konvertiere das Bild zu WebP im Browser
      const { blob, filename } = await convertToWebP(selectedFile);

      setStatus({
        message: `Konvertierung abgeschlossen, starte Upload in ${selectedBucketName}...`,
        type: "info",
      });

      // Erstelle FormData mit dem konvertierten WebP
      const formData = new FormData();
      formData.append("webp", blob);
      formData.append("bucket", "bucket2"); // Fixed value
      formData.append("filename", filename);

      // Upload durchführen
      const result = await uploadToR2(formData);

      setUploadedUrl(result.url);
      setStatus({
        message: `Upload erfolgreich!`,
        type: "success",
        details: `Datei: ${filename}\nBucket: ${result.bucket}\nGröße: ${(
          result.size / 1024
        ).toFixed(2)} KB`,
      });

      setSelectedFile(null);
      setPreview(null);
      setPreviewUrl(null);
      // Reset file input
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      setStatus({
        message: "Fehler beim Upload",
        type: "error",
        details: (error as Error).message,
      });
    }

    setIsUploading(false);
  };

  const handleAdditionalFilesChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files) {
      // Überprüfe die Dateien
      const files = Array.from(e.target.files);
      const invalidFile = files.find((file) => !file.type.startsWith("image/"));
      const largeFile = files.find((file) => file.size > 10 * 1024 * 1024);

      if (invalidFile) {
        setStatus({
          message: "Fehler: Bitte nur Bilddateien auswählen",
          type: "error",
        });
        e.target.value = "";
        return;
      }

      if (largeFile) {
        setStatus({
          message:
            "Fehler: Eine oder mehrere Dateien sind zu groß (Maximum 10MB)",
          type: "error",
        });
        e.target.value = "";
        return;
      }

      setAdditionalFiles(e.target.files);
    }
  };

  const handleUploadAdditional = async () => {
    if (!additionalFiles || !baseName) {
      setStatus({
        message:
          "Bitte wählen Sie Bilder aus und geben Sie einen Basisnamen ein",
        type: "error",
      });
      return;
    }

    setIsUploadingAdditional(true);
    const images: UploadedImage[] = [];
    let currentMarkdown = mdxContent.markdown; // Get current markdown content

    try {
      const files = Array.from(additionalFiles);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const paddedIndex = String(i + 1).padStart(2, "0");
        const newFilename = `${baseName}_${paddedIndex}.webp`;

        // Konvertiere das Bild
        const { blob } = await (async () => {
          return new Promise<{ blob: Blob; filename: string }>(
            (resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement("canvas");
                let finalWidth = img.width;
                let finalHeight = img.height;

                // Resize to max 1500px width while maintaining aspect ratio
                if (img.width > 1500) {
                  const scale = 1500 / img.width;
                  finalWidth = 1500;
                  finalHeight = Math.round(img.height * scale);
                }

                canvas.width = finalWidth;
                canvas.height = finalHeight;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                  reject(new Error("Canvas context nicht verfügbar"));
                  return;
                }

                // Draw the resized image
                ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

                canvas.toBlob(
                  (blob) => {
                    if (blob) {
                      const filename = `${file.name.replace(
                        /\.[^/.]+$/,
                        ""
                      )}.webp`;
                      resolve({ blob, filename });
                    } else {
                      reject(new Error("WebP-Konvertierung fehlgeschlagen"));
                    }
                  },
                  "image/webp",
                  0.8
                );
              };

              img.onerror = () =>
                reject(new Error("Bilddatei konnte nicht geladen werden"));
              img.src = URL.createObjectURL(file);
            }
          );
        })();

        // Erstelle FormData
        const formData = new FormData();
        formData.append("webp", blob);
        formData.append("bucket", "bucket2"); // Fixed value
        formData.append("filename", newFilename);

        // Upload durchführen
        const result = await uploadToR2(formData);

        images.push({
          url: result.url,
          filename: newFilename,
        });

        // Add image markdown after each successful upload
        currentMarkdown += `\n\n![]({IMAGE_PATH}/${newFilename})`;

        // Update markdown content in state after each upload
        setMdxContent((prev) => ({
          ...prev,
          markdown: currentMarkdown,
        }));

        setStatus({
          message: `Upload läuft... (${i + 1}/${files.length})`,
          type: "info",
        });
      }

      setUploadedImages(images);

      setStatus({
        message: `${images.length} Bilder erfolgreich hochgeladen!`,
        type: "success",
      });

      // Reset
      setAdditionalFiles(null);
      const fileInput = document.querySelector(
        'input[name="additional"]'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      setStatus({
        message: "Fehler beim Upload der zusätzlichen Bilder",
        type: "error",
        details: (error as Error).message,
      });
    }

    setIsUploadingAdditional(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Label htmlFor="image">Bild auswählen (max. 10MB)</Label>
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById("image")?.click()}
            className="w-full"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Bild auswählen
          </Button>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {preview && (
          <div className="mt-4 relative">
            <div
              className="relative bg-white rounded-lg overflow-hidden"
              onClick={handleImageClick}
              style={{ cursor: "crosshair" }}
            >
              <img
                ref={imageRef}
                src={preview || "/placeholder.svg"}
                alt="Vorschau"
                className="w-full h-auto"
              />
              {focalPoint && (
                <>
                  <div
                    className="absolute w-6 h-6 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      left: `${focalPoint.x * 100}%`,
                      top: `${focalPoint.y * 100}%`,
                    }}
                  >
                    <Crosshair className="w-6 h-6 text-primary stroke-2" />
                  </div>
                  <div
                    className="absolute inset-0 pointer-events-none border-2 border-primary"
                    style={{
                      aspectRatio: "1.94/1",
                      width: "100%",
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: `translate(-50%, -50%) translateY(${
                        (focalPoint.y - 0.5) * 100
                      }%) translateX(${(focalPoint.x - 0.5) * 100}%)`,
                    }}
                  />
                </>
              )}
              <div className="absolute inset-0 bg-black/10 pointer-events-none">
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  Klicken um Bildmitte festzulegen
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {selectedFile?.name} (
              {selectedFile
                ? (selectedFile.size / 1024 / 1024).toFixed(2)
                : "0.00"}
              MB)
              {imageDimensions && (
                <span className="block">
                  {imageDimensions.width} x {imageDimensions.height} px
                  {focalPoint && (
                    <span className="block text-xs">
                      Bildmitte: {Math.round(focalPoint.x * 100)}% x{" "}
                      {Math.round(focalPoint.y * 100)}%
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Markdown Editor</h2>
          <MarkdownEditor
            onContentChange={setMdxContent}
            initialContent={mdxContent}
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">Zusätzliche Bilder</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseName">Basis-Name für Bilder</Label>
            <Input
              id="baseName"
              placeholder="z.B. TinyHouse"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional">
              Bilder auswählen (max. 10MB pro Bild)
            </Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("additional")?.click()}
                className="w-full"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Bilder auswählen
              </Button>
              <Button
                type="button"
                disabled={
                  !additionalFiles || !baseName || isUploadingAdditional
                }
                onClick={handleUploadAdditional}
              >
                {isUploadingAdditional ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird hochgeladen...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Hochladen
                  </>
                )}
              </Button>
            </div>
            <input
              id="additional"
              name="additional"
              type="file"
              accept="image/*"
              multiple
              onChange={handleAdditionalFilesChange}
              className="hidden"
            />
          </div>

          {additionalFiles && (
            <div className="text-sm text-muted-foreground">
              {Array.from(additionalFiles).map((file, index) => (
                <div key={index} className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <span>{file.name}</span>
                  <span className="text-xs">
                    ({(file.size / 1024 / 1024).toFixed(2)}MB)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={!selectedFile || isUploading}
          className="flex-1"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird hochgeladen...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Hochladen & Konvertieren
            </>
          )}
        </Button>

        {uploadedUrl && (
          <Button
            type="button"
            variant="outline"
            onClick={handleGithubCommit}
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
            Zu GitHub committen
          </Button>
        )}
      </div>

      {status.message && (
        <Alert variant={status.type === "error" ? "destructive" : "default"}>
          <AlertDescription>
            <div className="space-y-2">
              <p>{status.message}</p>
              {status.details && (
                <pre className="text-xs whitespace-pre-wrap">
                  {status.details}
                </pre>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {uploadedUrl && (
        <div className="text-sm text-muted-foreground break-all">
          <p className="font-semibold">Upload URL:</p>
          <p className="mt-1">{uploadedUrl}</p>
        </div>
      )}
    </form>
  );
}
