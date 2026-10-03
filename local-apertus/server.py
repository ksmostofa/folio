"""Bounded loopback OpenAI-compatible adapter for the official small Apertus."""
import argparse
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from runtime import Runtime, MODEL_ID, REVISION

runtime = None
generation_lock = threading.Lock()

class Handler(BaseHTTPRequestHandler):
    def reply(self, status, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/v1/models":
            self.reply(200, {"object": "list", "data": [{"id": MODEL_ID, "object": "model", "owned_by": "swiss-ai"}]})
        elif self.path == "/health":
            self.reply(200, {"ready": True, "model": MODEL_ID, "revision": REVISION, "load_seconds": runtime.load_seconds, "device": "cpu"})
        else:
            self.reply(404, {"error": "Unknown endpoint"})

    def do_POST(self):
        if self.path != "/v1/chat/completions":
            self.reply(404, {"error": "Unknown endpoint"}); return
        if self.headers.get("Origin"):
            self.reply(403, {"error": "Direct browser requests are disabled. Use the Folio server."}); return
        if not generation_lock.acquire(blocking=False):
            self.reply(429, {"error": "One CPU inference is already running"}); return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 240000:
                raise ValueError("Request must be 1-240000 bytes")
            payload = json.loads(self.rfile.read(length))
            if payload.get("model") != MODEL_ID or payload.get("stream", False):
                raise ValueError("Only the pinned model and nonstreaming requests are supported")
            if payload.get("temperature", 0) != 0:
                raise ValueError("This adapter supports deterministic temperature=0 only")
            self.reply(200, runtime.generate(payload.get("messages"), payload.get("max_tokens", 1024)))
        except (ValueError, TypeError, KeyError) as error:
            self.reply(400, {"error": str(error)})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            self.reply(500, {"error": "Local inference failed; no fallback performed"})
        finally:
            generation_lock.release()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    runtime = Runtime()
    print(json.dumps({"ready": True, "model": MODEL_ID, "load_seconds": runtime.load_seconds, "url": f"http://127.0.0.1:{args.port}/v1"}), flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
