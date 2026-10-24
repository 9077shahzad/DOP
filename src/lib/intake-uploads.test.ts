import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_UPLOAD_BYTES, uploadIntakeFile, UploadRejected } from "./intake-uploads";

const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ upload }) } },
}));

describe("booking photo/video upload rules", () => {
  beforeEach(() => upload.mockReset().mockResolvedValue({ error: null }));

  it("keeps the maximum at 25 MB per file and rejects larger files before storage", async () => {
    expect(MAX_UPLOAD_BYTES).toBe(25 * 1024 * 1024);
    const file = new File(["test"], "large.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: MAX_UPLOAD_BYTES + 1 });
    await expect(uploadIntakeFile("test-draft", "photo", file)).rejects.toMatchObject({ reason: "too_large" });
    expect(upload).not.toHaveBeenCalled();
  });

  it("allows a file at the exact size limit", async () => {
    const file = new File(["test"], "limit.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: MAX_UPLOAD_BYTES });
    await expect(uploadIntakeFile("test-draft", "photo", file)).resolves.toMatchObject({ size_bytes: MAX_UPLOAD_BYTES });
    expect(upload).toHaveBeenCalledOnce();
  });

  it("preserves multiple photos and video metadata in the draft folder", async () => {
    for (const [name, mime, kind] of [["one.jpg", "image/jpeg", "photo"], ["two.png", "image/png", "photo"], ["short.mp4", "video/mp4", "video"]] as const) {
      const result = await uploadIntakeFile("test-draft", kind, new File(["test"], name, { type: mime }));
      expect(result).toMatchObject({ file_name: name, mime_type: mime, kind });
      expect(result.storage_path).toMatch(new RegExp(`^intake/test-draft/${kind}-`));
    }
    expect(upload).toHaveBeenCalledTimes(3);
  });

  it("rejects unsupported file formats without uploading", async () => {
    await expect(uploadIntakeFile("test-draft", "photo", new File(["test"], "unsafe.txt", { type: "text/plain" }))).rejects.toBeInstanceOf(UploadRejected);
    expect(upload).not.toHaveBeenCalled();
  });
});