/**
 * Crew voice note.
 *
 * The recording is captured as PCM and uploaded as a complete WAV file, so it
 * decodes on any phone. Nothing is sent before the crew ticks consent, and the
 * structured result is a proposal the crew reads back — it never changes the
 * job by itself.
 */
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Card, CardHeader, NoticeState } from "@/components/system";
import { aiCrewVoiceNote } from "@/lib/ai.functions";
import type { CrewVoiceNote } from "@/lib/ai/assist.server";
import type { AiUnavailable } from "@/lib/ai/features";

type Recorder = {
  stream: MediaStream;
  ctx: AudioContext;
  node: ScriptProcessorNode;
  source: MediaStreamAudioSourceNode;
  chunks: Float32Array[];
};

function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const samples = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (pos: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(pos + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i] ?? 0);
  return btoa(binary);
}

export function VoiceNotePanel({ jobId, spokenLanguage }: { jobId: string; spokenLanguage?: string }) {
  const { t } = useTranslation("ai");
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [note, setNote] = useState<CrewVoiceNote | null>(null);
  const recorder = useRef<Recorder | null>(null);

  async function start() {
    setNotice(null);
    setNote(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];
      node.onaudioprocess = (event) => chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      source.connect(node);
      node.connect(ctx.destination);
      recorder.current = { stream, ctx, node, source, chunks };
      setRecording(true);
    } catch {
      setNotice(t("voice.permission"));
    }
  }

  async function stop() {
    const current = recorder.current;
    recorder.current = null;
    setRecording(false);
    if (!current) return;
    current.stream.getTracks().forEach((track) => track.stop());
    current.node.disconnect();
    current.source.disconnect();
    const blob = encodeWav(current.chunks, current.ctx.sampleRate);
    await current.ctx.close();
    if (blob.size < 4096) {
      setNotice(t("voice.tooShort"));
      return;
    }

    setBusy(true);
    try {
      const result = await aiCrewVoiceNote({
        data: {
          jobId,
          audioBase64: await toBase64(blob),
          filename: "recording.wav",
          mimeType: "audio/wav",
          ...(spokenLanguage ? { spokenLanguage } : {}),
        },
      });
      if (result.ok) {
        setNote(result.result);
        setNotice(t("voice.done"));
      } else {
        setNotice(t(`unavailable.${result.reason as AiUnavailable}`));
      }
    } catch {
      setNotice(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title={t("voice.title")} />
      <div className="space-y-3 p-4">
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1 size-5"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          <span>{t("voice.consent")}</span>
        </label>

        {recording ? (
          <Button variant="danger" block onClick={() => void stop()}>
            {t("voice.stop")}
          </Button>
        ) : (
          <Button block disabled={!consent || busy} onClick={() => void start()}>
            {busy ? t("voice.processing") : t("voice.record")}
          </Button>
        )}

        {notice ? <NoticeState message={notice} /> : null}

        {note ? (
          <div className="space-y-2 text-sm text-ink">
            <Lines title={t("voice.work")} items={note.work_completed} />
            <Lines title={t("voice.extra")} items={note.additional_work} />
            <Lines title={t("voice.incidents")} items={note.incidents} />
            <Lines title={t("voice.followUp")} items={note.follow_up} />
            <Lines title={t("voice.unclear")} items={note.unclear} />
            <details>
              <summary className="label-mono cursor-pointer text-soft">{t("voice.transcript")}</summary>
              <p className="mt-1 whitespace-pre-wrap text-soft">{note.transcript}</p>
            </details>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function Lines({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="label-mono text-soft">{title}</p>
      <ul className="mt-1 list-disc space-y-1 ps-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
