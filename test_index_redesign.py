# -*- coding: utf-8 -*-
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent

RETAINED_PAGES = [
    "index.html",
    "about.html",
    "services.html",
    "explore.html",
    "provider.html",
    "blog.html",
    "admin.html",
    "404.html",
]

PUBLIC_PAGES = [p for p in RETAINED_PAGES if p != "admin.html"]
JS_FILES = [
    "js/render-index.js",
    "js/about.js",
    "js/services.js",
    "js/explore.js",
    "js/provider-detail.js",
    "js/blog.js",
    "js/navFooter.js",
    "js/main.js",
]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def require_contains(path, needles):
    content = read(path)
    ok = True
    for needle in needles:
        if needle not in content:
            print(f"FAIL {path}: missing {needle!r}")
            ok = False
        else:
            print(f"OK   {path}: contains {needle!r}")
    return ok


def test_page_shells():
    ok = True
    for page in RETAINED_PAGES:
        content = read(page)
        for css in ("css/base.css", "css/components.css", "css/utilities.css"):
            if css not in content:
                print(f"FAIL {page}: missing shared stylesheet {css}")
                ok = False
        for legacy in ("css/style.css", "theme-toggle", "color-theme"):
            if legacy in content and page != "admin.html":
                print(f"FAIL {page}: public page still references legacy token {legacy}")
                ok = False
        print(f"OK   {page}: shared redesign shell checked")
    return ok


def test_public_navigation_scope():
    nav = read("js/navFooter.js")
    ok = True
    for removed in ("member.html", "member-profile.html", "member-admin.html", "surveys.html", "themeToggle"):
        if removed in nav:
            print(f"FAIL js/navFooter.js: removed public entry still present: {removed}")
            ok = False
    for kept in ("index.html", "about.html", "services.html", "explore.html", "blog.html"):
        if kept not in nav:
            print(f"FAIL js/navFooter.js: missing kept public entry: {kept}")
            ok = False
    if "['admin.html'" in nav or "./admin.html" in nav:
        print("FAIL js/navFooter.js: admin should not be displayed in public nav/footer")
        ok = False
    if ok:
        print("OK   js/navFooter.js: public navigation scope checked")
    return ok


def test_new_layout_contracts():
    checks = [
        ("js/render-index.js", ["home-hero", "service-links", "chiayi-map", "home-sdgs", "home-model", "home-achievements", "draw-svg", "sdgIconSvg", "sdg-border-svg", "sdg-icon-path"]),
        ("js/explore.js", ["resource-layout", "resource-filters", "filter-toggle", "resource-grid", "resource-keyword", "resource-category", "resource-location"]),
        ("js/provider-detail.js", ["provider-layout", "side-panel", "provider-map", "lock-county", "anchor-list", "flow-list", "provider-interview-link", "blogContent"]),
        ("js/blog.js", ["blog-layout", "article-row", "category-filter", "blog-lightbox-modal", "parseTimelineTime", "scrollToListTitle"]),
        ("js/navFooter.js", ["footer-social--facebook", "footer-social--instagram", "footer-social--line", "footer-social--threads", "nav-link-ring", "pathLength=\"320\""]),
        ("css/components.css", [".resource-layout", ".provider-layout", ".blog-layout", ".resource-grid", ".filter-toggle", ".resource-filters.collapsed #resource-filter-body", ".draw-svg", ".flow-list", ".footer-social--facebook:hover", ".lightbox { z-index: 5000", "--motion-interaction: 500ms", "body::before", ".sdg-border-svg", "navRingDraw", "sdgLineRedraw", "sdgFillIn"]),
        ("css/base.css", ["--color-primary", "--color-bg", "--color-card", "--color-brown"]),
        ("provider.html", ["js/data/blogContent.js"]),
    ]
    return all(require_contains(path, needles) for path, needles in checks)


def test_no_public_dark_mode():
    ok = True
    public_files = ["css/base.css", "css/components.css", "css/utilities.css", "js/main.js", "js/navFooter.js"] + PUBLIC_PAGES
    for path in public_files:
        content = read(path)
        for token in ("html.dark", "prefers-color-scheme", "toggle-theme"):
            if token in content:
                print(f"FAIL {path}: dark mode token still present: {token}")
                ok = False
    if ok:
        print("OK   public files: no dark mode tokens")
    return ok


def test_js_syntax():
    ok = True
    for js in JS_FILES:
        result = subprocess.run(["node", "--check", str(ROOT / js)], capture_output=True, text=True, check=False)
        if result.returncode != 0:
            print(f"FAIL {js}: syntax error")
            print(result.stderr)
            ok = False
        else:
            print(f"OK   {js}: node --check")
    return ok


if __name__ == "__main__":
    tests = [
        test_page_shells,
        test_public_navigation_scope,
        test_new_layout_contracts,
        test_no_public_dark_mode,
        test_js_syntax,
    ]
    passed = all(test() for test in tests)
    if passed:
        print("All index redesign checks passed.")
        sys.exit(0)
    print("Some redesign checks failed.")
    sys.exit(1)






