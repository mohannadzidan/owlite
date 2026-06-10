export function srtToVtt(srt: string): string {
  return (
    "WEBVTT\n\n" +
    srt
      .trim()
      .replace(/\r\n|\r/g, "\n")
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
  );
}
