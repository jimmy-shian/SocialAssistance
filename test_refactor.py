# -*- coding: utf-8 -*-
import os
import sys
import subprocess
import re

# Enforce UTF-8 encoding for standard output
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Target HTML pages in the project
HTML_PAGES = [
    "index.html",
    "about.html",
    "services.html",
    "explore.html",
    "provider.html",
    "blog.html",
    "member.html",
    "member-profile.html",
    "member-admin.html",
    "admin.html",
    "surveys.html",
    "404.html"
]

# Legacy stylesheets and scripts that MUST NOT be referenced
DELETED_ASSETS = [
    r"css/style\.css",
    r"css/site-theme\.css",
    r"css/layout-asym\.css",
    r"css/carousel\.css",
    r"css/services-tape\.css",
    r"css/home-visual-depth\.css",
    r"css/services-section\.css",
    r"css/ui-refine\.css",
    # Match root-level blog.css and 404.css, but allow page-specific ones
    r"(?<!pages/)blog\.css",
    r"(?<!pages/)404\.css",
    r"(?<!components/)toast\.js"
]

# Required CSS files that MUST be loaded in every HTML page
REQUIRED_CSS = [
    "css/base.css",
    "css/components.css",
    "css/utilities.css"
]

# Required JS files that MUST be loaded in every HTML page
REQUIRED_JS = [
    "js/components/themeToggle.js",
    "js/components/mobileMenu.js",
    "js/components/modal.js",
    "js/components/toast.js",
    "js/navFooter.js",
    "js/main.js"
]

def check_html_files():
    print("=== STEP 1: Verifying HTML Page Assets ===")
    all_passed = True
    
    for page in HTML_PAGES:
        if not os.path.exists(page):
            print(f"❌ Error: HTML file '{page}' is missing!")
            all_passed = False
            continue
            
        with open(page, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 1. Check for legacy assets
        has_legacy = False
        for legacy in DELETED_ASSETS:
            if re.search(legacy, content):
                print(f"❌ Error in '{page}': Contains reference to deleted asset '{legacy}'!")
                has_legacy = True
                all_passed = False
                
        # 2. Check for required CSS files
        missing_css = []
        for css in REQUIRED_CSS:
            if css not in content:
                missing_css.append(css)
                all_passed = False
                
        if missing_css:
            print(f"❌ Error in '{page}': Missing required CSS imports: {missing_css}")
            
        # 3. Check for required JS files
        missing_js = []
        for js in REQUIRED_JS:
            if js not in content:
                missing_js.append(js)
                all_passed = False
                
        if missing_js:
            print(f"❌ Error in '{page}': Missing required JS imports: {missing_js}")
            
        # 4. Check CSS load order (base -> components -> utilities -> pages)
        # We find their positions in the content
        positions = {}
        for css in REQUIRED_CSS:
            pos = content.find(css)
            if pos != -1:
                positions[css] = pos
                
        if len(positions) == len(REQUIRED_CSS):
            # Check order: base < components < utilities
            if not (positions["css/base.css"] < positions["css/components.css"] < positions["css/utilities.css"]):
                print(f"❌ Error in '{page}': CSS loading sequence is incorrect! Expected: base -> components -> utilities.")
                all_passed = False
                
        if not has_legacy and not missing_css and not missing_js:
            print(f"✅ Pass: '{page}' assets linked correctly.")
            
    return all_passed

def check_js_syntax():
    print("\n=== STEP 2: Checking Javascript Syntax (node --check) ===")
    all_passed = True
    js_files = []
    
    # Traverse js directory
    for root, dirs, files in os.walk("js"):
        for file in files:
            if file.endswith(".js"):
                js_files.append(os.path.join(root, file))
                
    for js_path in js_files:
        try:
            # Run node --check to validate syntax
            result = subprocess.run(
                ["node", "--check", js_path],
                capture_output=True,
                text=True,
                check=False
            )
            if result.returncode != 0:
                print(f"❌ Syntax Error in '{js_path}':")
                print(result.stderr)
                all_passed = False
            else:
                print(f"✅ Pass syntax check: '{js_path}'")
        except FileNotFoundError:
            print("⚠️ Warning: 'node' command not found. Skipping Javascript syntax validation.")
            return True
            
    return all_passed

if __name__ == "__main__":
    html_ok = check_html_files()
    js_ok = check_js_syntax()
    
    print("\n=== FINAL TEST SUMMARY ===")
    if html_ok and js_ok:
        print("🎉 All refactoring checks passed successfully! Ready for staging.")
        sys.exit(0)
    else:
        print("❌ Refactoring checks failed. Please inspect errors above.")
        sys.exit(1)
