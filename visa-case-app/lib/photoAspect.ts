/** 証明写真の規格の縦横比（縦4cm×横3cm → 縦／横 = 4／3） */
export const PHOTO_ASPECT_RATIO = 4 / 3;

/** 規格の縦横比からの許容範囲（比率に対する割合。±15%） */
export const PHOTO_ASPECT_TOLERANCE = 0.15;

export const PHOTO_ASPECT_WARNING =
  "縦横比が証明写真の規格（縦4cm×横3cm）と大きく異なります。背景・無帽等の規格は、別途目視でご確認ください。";

/** 縦横比が規格から許容範囲を超えて外れているかを返す。寸法が不正な場合は判定しない（false） */
export function isPhotoAspectOutOfRange(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false;
  const deviation = Math.abs(height / width / PHOTO_ASPECT_RATIO - 1);
  return deviation > PHOTO_ASPECT_TOLERANCE;
}

/** 画像ファイルの実寸を、クライアント側で読み取る。読み取れない場合は undefined */
export function readImageSize(file: Blob): Promise<{ width: number; height: number } | undefined> {
  return new Promise((resolve) => {
    if (typeof URL === "undefined" || typeof Image === "undefined") return resolve(undefined);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };
    img.src = url;
  });
}

/** 証明写真の縦横比の注意文。問題がない・判定できない場合は空文字 */
export async function photoAspectWarning(file: Blob): Promise<string> {
  const size = await readImageSize(file);
  return size && isPhotoAspectOutOfRange(size.width, size.height) ? PHOTO_ASPECT_WARNING : "";
}
