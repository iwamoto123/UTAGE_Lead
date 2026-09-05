/** YouTubeのサムネイルURLを組み立てる。
 *
 * サムネイル画像は公開配信されているので、APIキーもDBへの保存も要らない。
 * 動画IDさえ分かれば i.ytimg.com から直接引ける。アップロード時に設定した
 * カスタムサムネイルもここに反映される。
 */

/** watch?v= / youtu.be / shorts / embed / live のいずれからでも動画IDを取り出す */
export function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

/** mq=320x180 / hq=480x360 / maxres=1280x720（maxresは無い動画もある） */
export function youtubeThumbUrl(
  url: string | null | undefined,
  size: "mq" | "hq" | "maxres" = "mq",
): string | null {
  const id = youtubeVideoId(url);
  if (!id) return null;
  const name = size === "maxres" ? "maxresdefault" : size === "hq" ? "hqdefault" : "mqdefault";
  return `https://i.ytimg.com/vi/${id}/${name}.jpg`;
}
