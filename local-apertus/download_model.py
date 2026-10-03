"""Download only the pinned public Swiss AI checkpoint, with a 2 GB budget."""
import hashlib
import json
from pathlib import Path
import urllib.request

MODEL = "swiss-ai/Apertus-v1.1-0.5B-Instruct"
REVISION = "a140fd61fb57422c36a26301caea17edee799874"
ROOT = Path(__file__).resolve().parent / "model"
BUDGET = 2_000_000_000
metadata = json.load(urllib.request.urlopen(f"https://huggingface.co/api/models/{MODEL}/revision/{REVISION}?blobs=true", timeout=60))
files = [f for f in metadata["siblings"] if f["rfilename"] != ".gitattributes"]
assert metadata["sha"] == REVISION and not metadata["gated"]
assert sum(f["size"] for f in files) <= BUDGET
ROOT.mkdir(exist_ok=True)
manifest = {"model": MODEL, "revision": REVISION, "gated": False, "files": []}
for file in files:
    name, expected = file["rfilename"], file["size"]
    assert "/" not in name
    target = ROOT / name
    if not target.exists() or target.stat().st_size != expected:
        partial = target.with_suffix(target.suffix + ".partial")
        count = 0
        with urllib.request.urlopen(f"https://huggingface.co/{MODEL}/resolve/{REVISION}/{name}", timeout=120) as response, partial.open("wb") as out:
            while chunk := response.read(4 * 1024 * 1024):
                count += len(chunk)
                if count > expected or count > BUDGET:
                    raise ValueError("Download exceeded declared file size")
                out.write(chunk)
        assert count == expected, (name, count, expected)
        partial.rename(target)
    digest = hashlib.file_digest(target.open("rb"), "sha256").hexdigest()
    official_sha = file.get("lfs", {}).get("sha256")
    if official_sha:
        assert digest == official_sha, "Official LFS checksum mismatch"
    manifest["files"].append({"name": name, "bytes": expected, "sha256": digest, "official_lfs_sha256": official_sha})
    print(name, expected, digest, flush=True)
(ROOT.parent / "model-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
