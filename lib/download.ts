export function download(text: string, filename: string, type = "text/csv;charset=utf-8") {
  // the byte order mark makes spreadsheet apps read accented names correctly
  const url = URL.createObjectURL(new Blob(["\uFEFF", text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
