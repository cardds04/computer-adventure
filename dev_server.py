#!/usr/bin/env python3
"""개발용 정적 서버 — 항상 no-cache 헤더를 보내 브라우저 캐시 문제를 없앤다."""
import functools
import http.server
import socketserver

PORT = 8911
DIRECTORY = "/Users/happykimsfamily/Projects/ComputerAdventure"


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True
Handler = functools.partial(NoCacheHandler, directory=DIRECTORY)
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"no-cache dev server on http://localhost:{PORT} (dir: {DIRECTORY})")
    httpd.serve_forever()
