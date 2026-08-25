#!/usr/bin/env python3

"""Serve the static export at both root and GitHub Pages-style URLs."""

from argparse import ArgumentParser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import socket
from urllib.parse import urlsplit, urlunsplit


def normalize_base_path(value: str) -> str:
    normalized = f"/{value.strip('/')}"
    return "" if normalized == "/" else normalized


class PreviewHandler(SimpleHTTPRequestHandler):
    base_path = ""

    def translate_path(self, path: str) -> str:
        parsed = urlsplit(path)
        request_path = parsed.path

        if self.base_path and request_path == self.base_path:
            request_path = "/"
        elif self.base_path and request_path.startswith(f"{self.base_path}/"):
            request_path = request_path[len(self.base_path) :]

        translated = urlunsplit(("", "", request_path, parsed.query, ""))
        return super().translate_path(translated)


class DualStackServer(ThreadingHTTPServer):
    address_family = socket.AF_INET6

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("--port", type=int, default=3002)
    parser.add_argument("--bind", default="::")
    parser.add_argument("--directory", default="dist/client")
    parser.add_argument("--base-path", default="/work")
    args = parser.parse_args()

    output_root = Path(args.directory).resolve(strict=True)
    PreviewHandler.base_path = normalize_base_path(args.base_path)
    handler = partial(PreviewHandler, directory=str(output_root))

    server_class = DualStackServer if ":" in args.bind else ThreadingHTTPServer
    with server_class((args.bind, args.port), handler) as server:
        print(
            f"Serving {output_root} on port {args.port} "
            f"with alias {PreviewHandler.base_path or '/'}",
            flush=True,
        )
        server.serve_forever()


if __name__ == "__main__":
    main()
