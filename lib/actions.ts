"use server"

import { getSignatureDetails } from "./r2-helpers"

export async function uploadToR2(formData: FormData) {
  try {
    const webpBlob = formData.get("webp") as Blob
    const bucket = formData.get("bucket") as string
    const filename = formData.get("filename") as string

    if (!webpBlob) throw new Error("Keine Datei ausgewählt")

    // Debug-Logging für Bucket-Auswahl
    console.log("Upload-Prozess gestartet:")
    console.log("- Dateiname:", filename)
    console.log("- Dateigröße:", webpBlob.size, "bytes")
    console.log("- Bucket-Auswahl:", bucket)

    // Bestimme den Bucket-Namen basierend auf der Auswahl
    const bucketName = bucket === "bucket1" ? process.env.CLOUDFLARE_BUCKET_1 : process.env.CLOUDFLARE_BUCKET_2

    if (!bucketName) throw new Error("Bucket nicht konfiguriert")
    console.log("- Ziel-Bucket:", bucketName)

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID
    const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("Fehlende Cloudflare Zugangsdaten")
    }

    const host = `${accountId}.r2.cloudflarestorage.com`

    // Generiere AWS v4 Signatur
    const signatureResult = await getSignatureDetails(
      "PUT",
      `/${bucketName}/${filename}`,
      host,
      accessKeyId,
      secretAccessKey,
    )

    if (signatureResult.error) {
      throw new Error(signatureResult.error)
    }

    const { authorization, amzDate } = signatureResult

    console.log("- AWS Signatur generiert")

    // Konvertiere Blob zu ArrayBuffer
    const arrayBuffer = await webpBlob.arrayBuffer()
    console.log("- Datei für Upload vorbereitet")

    // Upload URL zusammenbauen
    const uploadUrl = `https://${host}/${bucketName}/${filename}`
    console.log("- Upload URL:", uploadUrl)

    // Upload zu R2 mit AWS v4 Signatur
    console.log("- Starte Upload...")
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "image/webp",
        Authorization: authorization,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        host: host,
      },
      body: arrayBuffer,
    })

    // Detaillierte Response-Überprüfung
    console.log("- Upload Response Status:", response.status)
    console.log("- Upload Response OK:", response.ok)

    const responseText = await response.text()
    console.log("- Upload Response Text:", responseText)

    if (!response.ok) {
      throw new Error(`Upload fehlgeschlagen: ${response.status} - ${responseText}`)
    }

    console.log("- Upload erfolgreich")

    return {
      success: true,
      filename,
      bucket: bucketName,
      size: webpBlob.size,
      url: uploadUrl,
    }
  } catch (error) {
    console.error("Upload error:", error)
    // Stelle sicher, dass wir immer eine Fehlermeldung als String zurückgeben
    const errorMessage = error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten"
    throw new Error(errorMessage)
  }
}

