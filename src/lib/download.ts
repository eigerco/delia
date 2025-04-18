export function createDownloadTrigger(title: string, blob: Blob) {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor element to trigger download
  const a = document.createElement("a");
  a.href = url;
  // Name of the file
  a.download = title;
  document.body.appendChild(a);
  a.click();

  // Clean up
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
