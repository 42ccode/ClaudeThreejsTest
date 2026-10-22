#!/usr/bin/env python3
"""本地开发服务器。

和 `python3 -m http.server` 一样提供静态文件，但每个响应都带 `Cache-Control: no-cache`，
浏览器每次都会向服务器确认文件是否更新（没改动时返回 304，不会重复下载），
改完代码普通刷新就能看到最新效果，不会再被旧的缓存卡住。

用法：python3 serve.py [端口]，默认 5173
"""
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    server = http.server.ThreadingHTTPServer(('', port), NoCacheHandler)
    print(f'NEBULA LAB 已启动：http://localhost:{port}/hub.html  （Ctrl+C 停止）', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
