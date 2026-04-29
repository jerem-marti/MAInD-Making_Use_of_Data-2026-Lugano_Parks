"""Tiny dev server for the blob prototype.

ES modules + fetch() require an http context (file:// is blocked by CORS).
Run:  python serve.py     then open  http://localhost:8000/
"""
import http.server, socketserver
PORT = 8001
with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as srv:
    print(f"Serving http://localhost:{PORT}/  (Ctrl+C to stop)")
    srv.serve_forever()
