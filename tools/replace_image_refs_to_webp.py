# -*- coding: utf-8 -*-
"""
Replace Image References to WebP
Scans HTML, JS, CSS, and JSON files, and replaces occurrences of .jpg, .jpeg, .png
with .webp IF the corresponding .webp file exists in the project's img/ directory.
Supports --dry-run.
"""

import os
import sys
import re
import argparse

def build_webp_map(img_dir):
    """
    Scans the local img_dir and builds a map of lowercase basename (without extension)
    to whether its .webp counterpart exists.
    """
    webp_map = set()
    img_dir = os.path.abspath(img_dir)
    if not os.path.isdir(img_dir):
        print(f"[Warning] Image directory not found: {img_dir}".encode('utf-8').decode('utf-8'))
        return webp_map
        
    for root, dirs, files in os.walk(img_dir):
        for file in files:
            name, ext = os.path.splitext(file)
            if ext.lower() == '.webp':
                # Map the lowercase name to true
                webp_map.add(name.lower())
    return webp_map

def replace_refs_in_file(file_path, webp_map, dry_run=False):
    """
    Reads a file, replaces image references if the webp exists, and writes back.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"[Error] Failed to read {file_path}: {e}".encode('utf-8').decode('utf-8'), file=sys.stderr)
        return False
        
    # Regular expression to match paths or URLs ending in .jpg, .jpeg, .png
    # We look for matches of letters/numbers/special characters followed by .jpg, .jpeg, .png
    # Specifically, we capture the prefix path/domain, the filename (without extension), and the extension.
    # Pattern: matches a filename like "some-pic.jpg" or "https://path/to/pic.png"
    pattern = re.compile(r'([\w\-/\\:\.@]+?)([^/\s\'"\\()<>]+?)\.(jpg|jpeg|png)\b', re.IGNORECASE)
    
    modified = False
    new_content_list = []
    last_idx = 0
    
    for match in pattern.finditer(content):
        full_match = match.group(0)
        prefix = match.group(1)
        filename = match.group(2)
        ext = match.group(3)
        
        # Check if filename.webp exists in our webp_map
        if filename.lower() in webp_map:
            # We found a match where a WebP exists!
            # Perform replacement
            replaced_str = f"{prefix}{filename}.webp"
            
            # Print change
            start, end = match.span()
            # Context snippet
            snippet_start = max(0, start - 30)
            snippet_end = min(len(content), end + 30)
            snippet = content[snippet_start:snippet_end].replace('\n', ' ')
            print(f"File: {os.path.basename(file_path)}".encode('utf-8').decode('utf-8'))
            print(f"  Match:   {full_match}".encode('utf-8').decode('utf-8'))
            print(f"  Replace: {replaced_str}".encode('utf-8').decode('utf-8'))
            print(f"  Context: ...{snippet}...".encode('utf-8').decode('utf-8'))
            
            # Append content up to match, then replaced string
            new_content_list.append(content[last_idx:start])
            new_content_list.append(replaced_str)
            last_idx = end
            modified = True
            
    if modified:
        new_content_list.append(content[last_idx:])
        new_content = "".join(new_content_list)
        
        if not dry_run:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"[Success] Updated: {file_path}".encode('utf-8').decode('utf-8'))
            except Exception as e:
                print(f"[Error] Failed to write {file_path}: {e}".encode('utf-8').decode('utf-8'), file=sys.stderr)
        else:
            print(f"[Dry-Run] Would update: {file_path}".encode('utf-8').decode('utf-8'))
            
    return modified

def scan_and_replace(project_dir, webp_map, dry_run=False):
    """
    Scans HTML, JS, CSS, JSON files in the project directory.
    """
    exclude_dirs = {'.git', 'node_modules', 'venv', '.gemini', 'tools'}
    include_extensions = {'.html', '.js', '.css', '.json'}
    
    print(f"Scanning for image references in: {project_dir}".encode('utf-8').decode('utf-8'))
    print(f"Dry-run: {dry_run}".encode('utf-8').decode('utf-8'))
    
    modified_count = 0
    
    for root, dirs, files in os.walk(project_dir):
        # Exclude specific directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in include_extensions:
                file_path = os.path.join(root, file)
                if replace_refs_in_file(file_path, webp_map, dry_run):
                    modified_count += 1
                    
    print(f"--- Reference Replacement Summary ---".encode('utf-8').decode('utf-8'))
    print(f"Files modified: {modified_count}".encode('utf-8').decode('utf-8'))

if __name__ == '__main__':
    # Force stdout/stderr encoding to utf-8 to avoid Windows console cp950 encoding errors
    if sys.version_info >= (3, 7):
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
        
    parser = argparse.ArgumentParser(description="Replace image extensions to .webp when .webp exists")
    parser.add_argument("--dir", default=".", help="Project root directory (default: current directory)")
    parser.add_argument("--img-dir", default="img", help="Directory containing converted webp images (default: img)")
    parser.add_argument("--dry-run", action="store_true", help="Print changes without modifying files")
    
    args = parser.parse_args()
    
    project_root = os.path.abspath(args.dir)
    img_dir_path = args.img_dir
    if not os.path.isabs(img_dir_path):
        img_dir_path = os.path.join(project_root, img_dir_path)
        
    webp_map = build_webp_map(img_dir_path)
    print(f"Found {len(webp_map)} WebP images in local img directory.".encode('utf-8').decode('utf-8'))
    
    if len(webp_map) == 0:
        print("[Warning] No WebP files found. Please run the conversion tool first!".encode('utf-8').decode('utf-8'))
        
    scan_and_replace(project_root, webp_map, args.dry_run)
