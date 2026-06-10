# -*- coding: utf-8 -*-
"""
WebP Batch Image Converter
Converts jpg, jpeg, png files in a directory to webp format.
Uses Pillow for image processing.
"""

import os
import sys
import argparse
from PIL import Image

def convert_image(file_path, quality=82, max_side=1600, delete_original=False):
    """
    Converts a single image file to WebP format.
    """
    try:
        # Resolve path
        file_path = os.path.abspath(file_path)
        dir_name = os.path.dirname(file_path)
        base_name = os.path.basename(file_path)
        name, ext = os.path.splitext(base_name)
        
        # Output path
        output_name = f"{name}.webp"
        output_path = os.path.join(dir_name, output_name)
        
        # Open image
        with Image.open(file_path) as img:
            # Check format support
            if img.format not in ('JPEG', 'PNG', 'MPO'):
                # Some files might have jpeg/png extension but different format, Pillow will handle
                pass
            
            # Convert palette/RGBA modes to RGB if saving as JPEG, but WebP supports transparency (RGBA)
            # If PNG has alpha channel, WebP supports it.
            # Resize if max_side is set
            w, h = img.size
            if max(w, h) > max_side:
                if w > h:
                    new_w = max_side
                    new_h = int(h * (max_side / w))
                else:
                    new_h = max_side
                    new_w = int(w * (max_side / h))
                print(f"[Resize] {base_name}: {w}x{h} -> {new_w}x{new_h}".encode('utf-8').decode('utf-8'))
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            # Save as WebP
            img.save(output_path, 'WEBP', quality=quality)
            print(f"[Success] Converted: {base_name} -> {output_name}".encode('utf-8').decode('utf-8'))
            
        if delete_original:
            os.remove(file_path)
            print(f"[Delete] Removed original: {base_name}".encode('utf-8').decode('utf-8'))
            
        return True
    except Exception as e:
        print(f"[Error] Failed to convert {file_path}: {e}".encode('utf-8').decode('utf-8'), file=sys.stderr)
        return False

def batch_convert(directory, quality=82, max_side=1600, delete_original=False):
    """
    Recursively scans the directory and converts images to WebP.
    """
    directory = os.path.abspath(directory)
    if not os.path.isdir(directory):
        print(f"[Error] Directory not found: {directory}".encode('utf-8').decode('utf-8'), file=sys.stderr)
        return
    
    print(f"Starting batch conversion in: {directory}".encode('utf-8').decode('utf-8'))
    print(f"Params: quality={quality}, max_side={max_side}, delete_original={delete_original}".encode('utf-8').decode('utf-8'))
    
    target_extensions = ('.jpg', '.jpeg', '.png')
    success_count = 0
    fail_count = 0
    skip_count = 0
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in target_extensions:
                file_path = os.path.join(root, file)
                # Avoid converting files that already have a webp counterpart (unless we want to overwrite)
                # But wait, if delete_original is False, we might skip to save time.
                # Actually, let's always process or check if we want to overwrite.
                # For safety, we overwrite existing webp to ensure quality/max_side is applied.
                if convert_image(file_path, quality, max_side, delete_original):
                    success_count += 1
                else:
                    fail_count += 1
            else:
                if ext == '.webp':
                    skip_count += 1
                    
    print(f"--- Conversion Summary ---".encode('utf-8').decode('utf-8'))
    print(f"Successfully converted: {success_count}".encode('utf-8').decode('utf-8'))
    print(f"Failed conversions: {fail_count}".encode('utf-8').decode('utf-8'))
    print(f"WebP files skipped/existing: {skip_count}".encode('utf-8').decode('utf-8'))

if __name__ == '__main__':
    # Force stdout/stderr encoding to utf-8 to avoid Windows console cp950 encoding errors
    if sys.version_info >= (3, 7):
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
        
    parser = argparse.ArgumentParser(description="Batch convert images to WebP format")
    parser.add_argument("--dir", default="img", help="Directory containing images to convert (default: img)")
    parser.add_argument("--quality", type=int, default=82, help="WebP compression quality (default: 82)")
    parser.add_argument("--max-side", type=int, default=1600, help="Resize image if its longest side exceeds this value (default: 1600)")
    parser.add_argument("--delete", action="store_true", help="Delete original image after successful conversion")
    
    args = parser.parse_args()
    
    # Resolve the directory relative to current working directory
    target_dir = args.dir
    if not os.path.isabs(target_dir):
        # By default, assume it's in the project workspace
        target_dir = os.path.join(os.getcwd(), target_dir)
        
    batch_convert(target_dir, args.quality, args.max_side, args.delete)
