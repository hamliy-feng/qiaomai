"""Serve this project's frontend; never replace another project's local server."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import webbrowser
import socket

class FrontendServer(ThreadingHTTPServer):
    allow_reuse_address = False
    def server_bind(self):
        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()

root = Path(__file__).resolve().parents[1] / 'frontend'
handler = partial(SimpleHTTPRequestHandler, directory=str(root))
server = None
for port in range(8767, 8800):
    try:
        server = FrontendServer(('127.0.0.1', port), handler)
        break
    except OSError:
        continue
if server is None:
    raise SystemExit('无法分配预览端口（8767–8799），请关闭不用的侨脉预览后重试。')
url = f'http://127.0.0.1:{server.server_port}/index.html'
print(f'侨脉预览：{url}\n关闭此窗口或按 Ctrl+C 停止。', flush=True)
webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
