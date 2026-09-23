#!/usr/bin/env python3
"""
build.py — bundle the modular PWA into single self-contained HTML files.

  python3 build.py

Outputs
  dist/money-doesnt-deserve-my-time.html   full standalone HTML document (open or host anywhere)
  dist/artifact.html                       body-only variant for hosts that supply their own <head>

The single-file builds keep every module's code intact (clean internal
architecture) but skip the service worker/manifest, which need separate files.
"""
import re, pathlib

ROOT = pathlib.Path(__file__).parent
html = (ROOT / 'index.html').read_text(encoding='utf-8')
css = (ROOT / 'styles.css').read_text(encoding='utf-8')
scripts = re.findall(r'<script src="(js/[^"]+)"></script>', html)
js = '\n'.join(f'/* ===== {s} ===== */\n' + (ROOT / s).read_text(encoding='utf-8') for s in scripts)
js = js.replace('</script', '<\\/script')
body = html.split('<!--APP-->')[1].split('<!--/APP-->')[0]
fonts = re.search(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com[^"]+)">', html).group(1)
boot = "<script>document.documentElement.dataset.bundle='single';document.documentElement.dataset.mode='dark';document.documentElement.dataset.accent='gold';document.documentElement.dataset.host='sandbox';</script>"

(ROOT / 'dist').mkdir(exist_ok=True)

standalone = f'''<!doctype html>
<html lang="en" data-mode="dark" data-accent="gold" data-bundle="single">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Money Doesn’t Deserve My Time</title>
<meta name="theme-color" content="#0a0f1c">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{fonts}">
<style>
{css}
</style>
</head>
<body>
{body}
<script>
{js}
</script>
</body>
</html>
'''
(ROOT / 'dist' / 'money-doesnt-deserve-my-time.html').write_text(standalone, encoding='utf-8')

artifact = f'''<title>Money Doesn’t Deserve My Time</title>
{boot}
<link rel="stylesheet" href="{fonts}">
<style>
{css}
</style>
{body}
<script>
{js}
</script>
'''
(ROOT / 'dist' / 'artifact.html').write_text(artifact, encoding='utf-8')
print('built', len(standalone) // 1024, 'KB standalone,', len(artifact) // 1024, 'KB artifact')
