/** Anything the panel can hand to the browser as a file. */
export interface Downloadable {
  filename: string;
  mime: string;
  content: string | Uint8Array;
}

/** Triggers a browser download from the page context. No `downloads` permission needed. */
export function downloadFile(file: Downloadable, doc: Document = document): void {
  const blob = new Blob([file.content as BlobPart], { type: file.mime });
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = file.filename;
  a.style.display = 'none';
  doc.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
