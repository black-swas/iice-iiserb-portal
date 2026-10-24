#!/usr/bin/env python3
"""
Threaded SPA server for the IICE IISER Bhopal website (zlm_final).

Serves static assets with SPA route fallback. Missing images return 404
(no silent placeholder substitution) so problems surface during QA.

Production notes (Render web service ready):
  - binds 0.0.0.0 and honors $PORT (falls back to the CLI arg, then 3000)
  - correct MIME types for webp / avif / woff2 / woff / ttf / mjs
  - HTML and SPA routes send Cache-Control: no-cache (so asset ?v=N bumps
    are always picked up); static assets cache for an hour
  - stdlib only — requirements.txt exists just so hosts detect Python

Usage: python server.py [port]   (default: $PORT or 3000)
"""
import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse, unquote

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT") or 3000)
HOST = "0.0.0.0"
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_EXTS = ('.webp', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.ico', '.avif',
               '.css', '.js', '.mjs', '.ttf', '.woff', '.woff2', '.json', '.pdf',
               '.map', '.txt', '.xml', '.mdx', '.wasm', '.html')


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    # stdlib map misses/under-specifies modern asset types
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".webp": "image/webp",
        ".avif": "image/avif",
        ".mjs": "text/javascript; charset=utf-8",
        ".woff2": "font/woff2",
        ".woff": "font/woff",
        ".ttf": "font/ttf",
        ".svg": "image/svg+xml",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def address_string(self):
        return self.client_address[0]

    def end_headers(self):
        # HTML + extensionless SPA routes always revalidate; assets cache an hour
        path = urlparse(self.path).path.lower()
        base = os.path.basename(path)
        if base.endswith(".html") or "." not in base:
            self.send_header("Cache-Control", "no-cache")
        else:
            self.send_header("Cache-Control", "public, max-age=3600")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def _route(self):
        """Map the request path to a servable local path. Returns False if
        the response was already sent (missing static asset)."""
        parsed = urlparse(self.path)
        rel_path = unquote(parsed.path).lstrip('/')
        file_path = os.path.join(ROOT_DIR, rel_path)

        # 1. exact file
        if os.path.isfile(file_path):
            self.path = '/' + rel_path.replace('\\', '/')
            return True

        # 2. case-insensitive file match (Windows-style paths land here)
        dir_name, base_name = os.path.split(file_path)
        if os.path.isdir(dir_name):
            try:
                for entry in os.listdir(dir_name):
                    if entry.lower() == base_name.lower() and os.path.isfile(os.path.join(dir_name, entry)):
                        actual = os.path.relpath(os.path.join(dir_name, entry), ROOT_DIR)
                        self.path = '/' + actual.replace('\\', '/')
                        return True
            except OSError:
                pass

        if rel_path.lower().endswith(STATIC_EXTS):
            self.send_error(404, f"Asset not found: {parsed.path}")
            return False

        # 3. SPA route fallback
        self.path = '/index.html'
        return True

    def do_GET(self):
        if self._route():
            super().do_GET()

    def do_HEAD(self):
        if self._route():
            super().do_HEAD()


class ThreadedServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    with ThreadedServer((HOST, PORT), SPAHandler) as httpd:
        print(f"IICE IISER Bhopal website live at http://{HOST}:{PORT} (Ctrl+C to stop)", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
