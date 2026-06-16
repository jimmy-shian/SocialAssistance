# -*- coding: utf-8 -*-
import os
import sys
import re
import subprocess

# Enforce UTF-8 encoding for standard output
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def test_html_classes():
    print("=== STEP 1: Verifying HTML Classes in index.html ===")
    html_path = "index.html"
    if not os.path.exists(html_path):
        print("❌ Error: index.html not found.")
        return False
        
    with open(html_path, "r", encoding="utf-8") as f:
        content = f.read()

    expected_patterns = [
        r'class="[^"]*philosophy-section[^"]*scroll-reveal[^"]*"',
        r'class="[^"]*services-circular-section[^"]*scroll-reveal[^"]*"',
        r'class="[^"]*sdgs-section[^"]*scroll-reveal[^"]*"',
        r'class="[^"]*team-section[^"]*scroll-reveal[^"]*"',
        r'class="[^"]*scroll-reveal[^"]*"', # map section
        # Team card child reveal classes
        r'scroll-reveal-child \$\{animClass\}',
        r'if \(idx === 0\) animClass = \'reveal-left\'',
        r'else if \(idx === 1\) animClass = \'reveal-center\'',
        r'else animClass = \'reveal-right\''
    ]

    success = True
    for pat in expected_patterns:
        if not re.search(pat, content):
            print(f"❌ Error: Pattern '{pat}' not found in index.html")
            success = False
        else:
            print(f"✅ Pattern '{pat}' verified in index.html.")
            
    return success

def test_achievements_js_class():
    print("\n=== STEP 2: Verifying HTML Classes in achievements.js ===")
    js_path = os.path.join("js", "achievements.js")
    if not os.path.exists(js_path):
        print(f"❌ Error: {js_path} not found.")
        return False

    with open(js_path, "r", encoding="utf-8") as f:
        content = f.read()

    expected_patterns = [
        r'scroll-reveal-child \$\{animClass\}',
        r'if \(idx === 0\) animClass = \'reveal-left\'',
        r'else if \(idx === 1\) animClass = \'reveal-center\'',
        r'else animClass = \'reveal-right\''
    ]

    success = True
    for pat in expected_patterns:
        if not re.search(pat, content):
            print(f"❌ Error: Pattern '{pat}' not found in achievements.js")
            success = False
        else:
            print(f"✅ Pattern '{pat}' verified in achievements.js.")
            
    return success

def test_css_styles():
    print("\n=== STEP 3: Verifying CSS Styling Rules in home-visual-depth.css ===")
    css_path = os.path.join("css", "home-visual-depth.css")
    if not os.path.exists(css_path):
        print(f"❌ Error: {css_path} not found.")
        return False

    with open(css_path, "r", encoding="utf-8") as f:
        content = f.read()

    required_selectors = [
        ".philosophy-section.asym-layout",
        ".services-circular-section",
        ".sdgs-section",
        ".team-section",
        "#achievements-placeholder > section",
        "section.mt-5.text-center",
        ".scroll-reveal",
        ".scroll-reveal.revealed",
        # Child animations
        ".scroll-reveal-child",
        ".scroll-reveal-child.reveal-left",
        ".scroll-reveal-child.reveal-center",
        ".scroll-reveal-child.reveal-right",
        ".scroll-reveal.revealed .scroll-reveal-child.reveal-left",
        ".scroll-reveal.revealed .scroll-reveal-child.reveal-center",
        ".scroll-reveal.revealed .scroll-reveal-child.reveal-right",
        # Desktop staggered offsets
        ".team-section .team-card.reveal-left",
        ".team-section .team-card.reveal-center",
        ".team-section .team-card.reveal-right",
        "#achievements-grid > a.reveal-left",
        "#achievements-grid > a.reveal-center",
        "#achievements-grid > a.reveal-right"
    ]

    success = True
    for sel in required_selectors:
        if sel not in content:
            print(f"❌ Error: Selector '{sel}' not found in home-visual-depth.css.")
            success = False
        else:
            print(f"✅ Selector '{sel}' verified in CSS.")

    # Check for staggered offsets
    if "transform: translateY(-16px);" not in content:
        print("❌ Error: Staggered transform translateY(-16px) not found in CSS.")
        success = False
    if "transform: translateY(16px);" not in content:
        print("❌ Error: Staggered transform translateY(16px) not found in CSS.")
        success = False

    return success

def test_js_intersection_observer():
    print("\n=== STEP 4: Verifying JS Scroll Reveal in render-index.js ===")
    js_path = os.path.join("js", "render-index.js")
    if not os.path.exists(js_path):
        print(f"❌ Error: {js_path} not found.")
        return False

    with open(js_path, "r", encoding="utf-8") as f:
        content = f.read()

    indicators = [
        "IntersectionObserver",
        "scroll-reveal",
        "revealed",
        "entry.target.classList.add('revealed')"
    ]

    success = True
    for ind in indicators:
        if ind not in content:
            print(f"❌ Error: Scroll reveal indicator '{ind}' not found in render-index.js.")
            success = False
        else:
            print(f"✅ Scroll reveal indicator '{ind}' verified in JS.")

    return success

def check_js_syntax():
    print("\n=== STEP 5: Checking JavaScript syntax via node --check ===")
    files_to_check = [
        os.path.join("js", "render-index.js"),
        os.path.join("js", "achievements.js")
    ]
    all_passed = True
    for js_path in files_to_check:
        try:
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
            print("⚠️ Warning: 'node' command not found. Skipping syntax check.")
            return True
    return all_passed

if __name__ == "__main__":
    html_ok = test_html_classes()
    ach_js_ok = test_achievements_js_class()
    css_ok = test_css_styles()
    js_ok = test_js_intersection_observer()
    syntax_ok = check_js_syntax()

    print("\n=== FINAL REDESIGN TEST SUMMARY ===")
    if html_ok and ach_js_ok and css_ok and js_ok and syntax_ok:
        print("🎉 Success! All staggered card layouts, child reveal animations, and syntax checks passed!")
        sys.exit(0)
    else:
        print("❌ Test failed. Some errors were detected. Please review output above.")
        sys.exit(1)
