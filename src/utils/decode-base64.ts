export function base64ToPem(base64String: string) {
  return Buffer.from(base64String, "base64").toString("ascii");
}
