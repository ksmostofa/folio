"""Run model adapter and actual Folio in one process tree; no browser or keys."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request
from runtime import MODEL_ID

root = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument("--folio-root", type=Path, default=root.parent if (root.parent / "server.mjs").exists() else root.parent / "folio")
args = parser.parse_args()
processes = []

def get(url):
    return json.load(urllib.request.urlopen(url, timeout=1))

def ready(url, process):
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("Server exited before readiness; inspect api-smoke.log")
        try:
            return get(url)
        except OSError:
            time.sleep(.1)
    raise TimeoutError("Server did not start in 20 seconds")

with (root / "api-smoke.log").open("w") as log:
    try:
        model = subprocess.Popen([sys.executable, str(root / "server.py"), "--port", "8765"], stdout=log, stderr=log)
        processes.append(model)
        health = ready("http://127.0.0.1:8765/health", model)
        catalog = get("http://127.0.0.1:8765/v1/models")
        env = {**os.environ, "PORT": "4179", "HOST": "127.0.0.1", "OPENAI_BASE_URL": "http://127.0.0.1:8765/v1", "APERTUS_MODEL": MODEL_ID, "APERTUS_ALLOW_LOCAL": "1"}
        env.pop("APERTUS_API_KEY", None)
        folio = subprocess.Popen(["node", "server.mjs"], cwd=args.folio_root.resolve(), env=env, stdout=log, stderr=log)
        processes.append(folio)
        status = ready("http://127.0.0.1:4179/api/status", folio)
        fixtures = json.loads((args.folio_root / "tests/fixtures/extraction-gold.json").read_text())
        fixture = fixtures[0]
        started = time.monotonic()
        request = urllib.request.Request("http://127.0.0.1:4179/api/compile", data=json.dumps({"source": fixture["source"], "language": fixture["language"]}).encode(), headers={"Content-Type": "application/json"})
        result = json.load(urllib.request.urlopen(request, timeout=65))
        report = {"model_health": health, "catalog": catalog, "folio_status": status, "fixture": fixture["id"], "real_inference": True, "synthetic": True, "result": result, "elapsed_seconds": time.monotonic() - started}
        (root / "api-smoke.json").write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps(report, indent=2), flush=True)
    finally:
        for process in reversed(processes):
            process.terminate()
        for process in processes:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
