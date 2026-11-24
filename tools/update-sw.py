#!/usr/bin/env python3
"""Refresh the offline file list and cache version in sw.js.
Run before each release:  python3 tools/update-sw.py"""
import glob, os, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
ver = re.search(r"GAME_VERSION = '([\d.]+)'", open('js/util.js').read()).group(1)
files = ['./', './index.html', './style.css', './manifest.json'] + ['./' + f for f in sorted(glob.glob('icons/*.png'))] + ['./' + f for f in sorted(glob.glob('js/*.js'))]
sw = open('sw.js').read()
sw = re.sub(r"const CACHE = '[^']*';", f"const CACHE = 'hnk-v{ver}';", sw)
sw = re.sub(r"const SHELL = \[.*?\];", 'const SHELL = [\n' + ''.join(f"  '{f}',\n" for f in files) + '];', sw, flags=re.S)
open('sw.js', 'w').write(sw)
print('sw.js updated:', ver, len(files), 'files')
