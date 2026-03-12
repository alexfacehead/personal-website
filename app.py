from flask import Flask, send_from_directory, abort, render_template_string
import os
import re
import signal
import sys
import logging

# Serve only the public/ directory — nothing else is accessible
app = Flask(__name__, static_url_path='', static_folder='public')


# --- Security headers on every response -----------------------------------

@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "media-src 'self'; "
        "connect-src 'self' https://api.emailjs.com; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self' https://api.emailjs.com"
    )
    # Remove Flask/Werkzeug server header
    response.headers.pop('Server', None)
    return response


# --- Routes ---------------------------------------------------------------

@app.route('/')
def index():
    return app.send_static_file('index.html')


@app.route('/pages/<page_name>')
def render_page(page_name):
    # Whitelist: only allow .html files, no path traversal
    if not re.match(r'^[a-zA-Z0-9_-]+\.html$', page_name):
        abort(404)
    return send_from_directory('public/pages', page_name)


# --- Error handlers -------------------------------------------------------

ERROR_TEMPLATE = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ code }} — Alex Hugli</title>
    <style>
        body { background: #0a0a0a; color: #fafafa; font-family: Inter, system-ui, sans-serif;
               display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .box { text-align: center; }
        h1 { font-size: 4rem; margin: 0; color: #3b82f6; }
        p { color: #888; margin-top: .5rem; }
        a { color: #3b82f6; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body><div class="box">
    <h1>{{ code }}</h1>
    <p>{{ message }}</p>
    <p><a href="/">Back to home</a></p>
</div></body>
</html>'''


@app.errorhandler(404)
def not_found(e):
    return render_template_string(ERROR_TEMPLATE, code=404,
                                  message="Page not found."), 404


@app.errorhandler(500)
def server_error(e):
    return render_template_string(ERROR_TEMPLATE, code=500,
                                  message="Something went wrong."), 500


# --- Entry point ----------------------------------------------------------

if __name__ == '__main__':
    # Suppress noisy Werkzeug request logs unless debug mode
    port = int(os.environ.get('PORT', 8080))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'

    if not debug:
        log = logging.getLogger('werkzeug')
        log.setLevel(logging.WARNING)

    # Graceful shutdown on SIGTERM/SIGINT so the process exits cleanly
    def _shutdown(signum, frame):
        sys.exit(0)

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)

    # Flush stdout immediately so preview tools can read output
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)

    print(f' * Flask server starting on http://127.0.0.1:{port}', flush=True)
    app.run(
        host='127.0.0.1',
        port=port,
        debug=debug,
        use_reloader=False,
        threaded=True,
    )
