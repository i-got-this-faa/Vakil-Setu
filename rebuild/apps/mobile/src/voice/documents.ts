import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { CHAT_LIMITS } from "@legal-setu/domain";

export type DocumentSource = "camera" | "photo" | "pdf";
export type PickedDocument = { kind: "document"; mimeType: "image/jpeg" | "application/pdf"; data: ArrayBuffer; fileName: string };
export type PickResult = { kind: "ok"; input: PickedDocument } | { kind: "cancelled" } | { kind: "too_big" } | { kind: "failed" };

/** Longest side of a photographed page: sharp enough to read, small enough to send quickly. */
const PHOTO_MAX_SIDE = 1600;

/** Lets the person photograph a paper, pick a photo, or pick a PDF, and returns it ready to send. */
export async function pickDocument(source: DocumentSource): Promise<PickResult> {
  try {
    if (source === "pdf") {
      const picked = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true, multiple: false });
      const asset = picked.canceled ? undefined : picked.assets[0];
      if (!asset) return { kind: "cancelled" };
      if (asset.size !== undefined && asset.size > CHAT_LIMITS.documentBytes) return { kind: "too_big" };
      const data = await new File(asset.uri).arrayBuffer();
      if (data.byteLength > CHAT_LIMITS.documentBytes) return { kind: "too_big" };
      return { kind: "ok", input: { kind: "document", mimeType: "application/pdf", data, fileName: asset.name || "document.pdf" } };
    }
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { kind: "failed" };
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, allowsEditing: false };
    const picked = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = picked.canceled ? undefined : picked.assets[0];
    if (!asset) return { kind: "cancelled" };
    // Re-encode every photo as a modest JPEG: smaller uploads, and HEIC/WebP become a type the server accepts.
    const context = ImageManipulator.manipulate(asset.uri);
    const longest = Math.max(asset.width, asset.height);
    if (longest > PHOTO_MAX_SIDE) context.resize(asset.width >= asset.height ? { width: PHOTO_MAX_SIDE } : { height: PHOTO_MAX_SIDE });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
    const data = await new File(saved.uri).arrayBuffer();
    if (data.byteLength > CHAT_LIMITS.documentBytes) return { kind: "too_big" };
    return { kind: "ok", input: { kind: "document", mimeType: "image/jpeg", data, fileName: source === "camera" ? "photo.jpg" : asset.fileName || "photo.jpg" } };
  } catch {
    return { kind: "failed" };
  }
}
