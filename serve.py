#!/usr/bin/env python3
"""Dev server for TukType. No-cache so module edits show up on reload."""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
    root = str(Path(__file__).parent)
    print(f"TukType → http://127.0.0.1:{port}/")
    ThreadingHTTPServer(("127.0.0.1", port), partial(Handler, directory=root)).serve_forever()
