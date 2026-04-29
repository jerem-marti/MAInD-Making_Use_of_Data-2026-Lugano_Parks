"""Dev server for blob_V2. Forces cwd to this script's directory so
relative paths in index.html resolve correctly when launched from elsewhere.

Threaded so the browser can fan out parallel ES module / asset requests
without wedging the server.
"""
import http.server, os, socketserver

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = 8001

class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

with Server(("", PORT), http.server.SimpleHTTPRequestHandler) as srv:
    print(f"Serving http://localhost:{PORT}/  (cwd={os.getcwd()})")
    srv.serve_forever()
