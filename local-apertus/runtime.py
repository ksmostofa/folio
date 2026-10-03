"""Real CPU inference only. No fallback model, network, keys or remote code."""
import os
import resource
import time
from pathlib import Path
import torch
import transformers
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_ID = "swiss-ai/Apertus-v1.1-0.5B-Instruct"
REVISION = "a140fd61fb57422c36a26301caea17edee799874"
MAX_INPUT_TOKENS = 4096
MAX_OUTPUT_TOKENS = 1024

class Runtime:
    def __init__(self):
        torch.set_num_threads(int(os.environ.get("APERTUS_CPU_THREADS", "4")))
        started = time.monotonic()
        folder = str(Path(__file__).resolve().parent / "model")
        self.tokenizer = AutoTokenizer.from_pretrained(folder, local_files_only=True, trust_remote_code=False)
        self.model = AutoModelForCausalLM.from_pretrained(folder, local_files_only=True, trust_remote_code=False, dtype=torch.float32).eval()
        self.load_seconds = time.monotonic() - started

    def generate(self, messages, max_tokens=MAX_OUTPUT_TOKENS):
        if not isinstance(messages, list) or not 1 <= len(messages) <= 12:
            raise ValueError("Expected 1-12 chat messages")
        if any(not isinstance(m, dict) or m.get("role") not in {"system", "user", "assistant"} or not isinstance(m.get("content"), str) for m in messages):
            raise ValueError("Invalid chat messages")
        inputs = self.tokenizer.apply_chat_template(messages, add_generation_prompt=True, tokenize=True, return_dict=True, return_tensors="pt")
        count = inputs["input_ids"].shape[-1]
        if count > MAX_INPUT_TOKENS:
            raise ValueError(f"Input exceeds {MAX_INPUT_TOKENS} tokens; no truncation performed")
        limit = min(int(max_tokens), MAX_OUTPUT_TOKENS, MAX_INPUT_TOKENS - count)
        if limit < 1:
            raise ValueError("Positive output token limit required")
        started = time.monotonic()
        with torch.inference_mode():
            output = self.model.generate(**inputs, do_sample=False, use_cache=True, max_new_tokens=limit, max_time=55, pad_token_id=self.tokenizer.eos_token_id)
        elapsed = time.monotonic() - started
        generated = output[0][count:]
        ended = len(generated) > 0 and int(generated[-1]) == self.tokenizer.eos_token_id
        reason = "stop" if ended else "length" if len(generated) == limit else "time_limit"
        return {"model": MODEL_ID, "choices": [{"index": 0, "message": {"role": "assistant", "content": self.tokenizer.decode(generated, skip_special_tokens=True)}, "finish_reason": reason}], "usage": {"prompt_tokens": count, "completion_tokens": len(generated), "total_tokens": count + len(generated)}, "local_measurement": {"seconds": elapsed, "tokens_per_second": len(generated) / elapsed, "revision": REVISION, "torch": torch.__version__, "transformers": transformers.__version__, "dtype": "float32", "device": "cpu", "threads": torch.get_num_threads(), "output_cap": MAX_OUTPUT_TOKENS, "peak_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss}}
