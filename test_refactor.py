# -*- coding: utf-8 -*-
import os
import sys
import subprocess

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

RETAINED_HTML = [
    'index.html',
    'about.html',
    'services.html',
    'explore.html',
    'provider.html',
    'blog.html',
    'admin.html',
    '404.html',
]

REQUIRED_CSS = [
    'css/base.css',
    'css/components.css',
    'css/utilities.css',
]

LEGACY_PUBLIC_REFS = [
    'css/style.css',
    'css/site-theme.css',
    'css/layout-asym.css',
    'css/carousel.css',
    'css/services-tape.css',
    'css/home-visual-depth.css',
    'css/services-section.css',
    'css/ui-refine.css',
    'theme-toggle',
]

REMOVED_PUBLIC_LINKS = [
    'member.html',
    'member-profile.html',
    'member-admin.html',
    'surveys.html',
]


def read(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def check_html_assets():
    ok = True
    for page in RETAINED_HTML:
        if not os.path.exists(page):
            print(f'FAIL missing {page}')
            ok = False
            continue
        html = read(page)
        for css in REQUIRED_CSS:
            if css not in html:
                print(f'FAIL {page}: missing {css}')
                ok = False
        for legacy in LEGACY_PUBLIC_REFS:
            if legacy in html:
                print(f'FAIL {page}: legacy reference {legacy}')
                ok = False
        if page != 'admin.html':
            for href in REMOVED_PUBLIC_LINKS:
                if href in html:
                    print(f'FAIL {page}: public link still points to removed page {href}')
                    ok = False
        if ok:
            print(f'PASS checked {page}')
    return ok


def check_public_nav():
    nav = read(os.path.join('js', 'navFooter.js'))
    ok = True
    for href in REMOVED_PUBLIC_LINKS:
        if href in nav:
            print(f'FAIL navFooter.js still links {href}')
            ok = False
    for token in ['theme-toggle', '切換深淺色主題']:
        if token in nav:
            print(f'FAIL navFooter.js still contains theme UI token {token}')
            ok = False
    if './admin.html' in nav or "['admin.html'" in nav:
        print('FAIL navFooter.js displays admin in public navigation')
        ok = False
    if ok:
        print('PASS nav/footer public links')
    return ok


def check_js_syntax():
    ok = True
    for root, _, files in os.walk('js'):
        for name in files:
            if not name.endswith('.js'):
                continue
            path = os.path.join(root, name)
            result = subprocess.run(['node', '--check', path], capture_output=True, text=True)
            if result.returncode != 0:
                print(f'FAIL syntax {path}')
                print(result.stderr)
                ok = False
    if ok:
        print('PASS js syntax')
    return ok


if __name__ == '__main__':
    checks = [check_html_assets(), check_public_nav(), check_js_syntax()]
    if all(checks):
        print('All redesign checks passed.')
        sys.exit(0)
    sys.exit(1)
