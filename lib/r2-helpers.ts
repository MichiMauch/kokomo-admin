// AWS v4 Signatur Implementation
export function getAmzDate() {
  const date = new Date()
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "")
}

export function getDateStamp() {
  return getAmzDate().slice(0, 8)
}

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const algorithm = { name: "HMAC", hash: "SHA-256" }
  const cryptoKey = await crypto.subtle.importKey("raw", key, algorithm, false, ["sign"])
  return crypto.subtle.sign(algorithm, cryptoKey, new TextEncoder().encode(message))
}

async function deriveSigningKey(
  secret: string,
  datestamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${secret}`), datestamp)
  const kRegion = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, service)
  const kSigning = await hmacSha256(kService, "aws4_request")
  return kSigning
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function getSignatureDetails(
  method: string,
  pathname: string,
  host: string,
  accessKeyId: string,
  secretAccessKey: string,
  region = "auto",
  service = "s3",
) {
  try {
    const amzDate = getAmzDate()
    const datestamp = getDateStamp()

    // Canonical Request
    const canonicalUri = pathname
    const canonicalQuerystring = ""
    const canonicalHeaders =
      [`host:${host}`, `x-amz-content-sha256:UNSIGNED-PAYLOAD`, `x-amz-date:${amzDate}`].join("\n") + "\n"
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date"
    const payloadHash = "UNSIGNED-PAYLOAD"

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n")

    // String to Sign
    const algorithm = "AWS4-HMAC-SHA256"
    const credentialScope = `${datestamp}/${region}/${service}/aws4_request`
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      await toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalRequest))),
    ].join("\n")

    // Signature
    const signingKey = await deriveSigningKey(secretAccessKey, datestamp, region, service)
    const signature = toHex(await hmacSha256(signingKey, stringToSign))

    // Authorization Header
    const authorization = [
      `${algorithm} Credential=${accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(", ")

    return {
      authorization,
      amzDate,
      host,
      error: null,
    }
  } catch (error) {
    console.error("Signature generation error:", error)
    return {
      error: `Fehler bei der Signaturerstellung: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
    }
  }
}

