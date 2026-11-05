"""Local English-only presentation ASR. The recording is never sent to an API."""
import argparse
import json
import subprocess
import numpy as np
from faster_whisper import WhisperModel

parser = argparse.ArgumentParser()
parser.add_argument("audio", nargs="?")
parser.add_argument("--cache", required=True)
parser.add_argument("--download-only", action="store_true")
parser.add_argument("--check-only", action="store_true")
args = parser.parse_args()
model = WhisperModel("tiny.en", device="cpu", compute_type="int8", cpu_threads=2, download_root=args.cache, local_files_only=not args.download_only)
if not args.download_only and not args.check_only:
    if not args.audio:
        parser.error("audio is required")
    # Decode with the system FFmpeg to avoid differences between PyAV releases.
    decoded = subprocess.run(["ffmpeg", "-v", "error", "-i", args.audio,
                              "-t", "121", "-f", "f32le", "-ar", "16000", "-ac", "1", "pipe:1"],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=60)
    samples = np.frombuffer(decoded.stdout, dtype=np.float32)
    if len(samples) > 120 * 16000:
        raise ValueError("Voice notes must be no longer than 120 seconds")
    if len(samples) < 1600:
        raise ValueError("Voice note is too short")
    segments, info = model.transcribe(samples, language="en", beam_size=5,
                                     initial_prompt="Indian legal assistance. Jammu, Srinagar, BNS, theft, advocate, lawyer, consultation.")
    text = " ".join(segment.text.strip() for segment in segments).strip()
    print(json.dumps({"text": text, "language": "en", "simulated": False}))
