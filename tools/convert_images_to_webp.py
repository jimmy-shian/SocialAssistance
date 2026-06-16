# -*- coding: utf-8 -*-
"""
WebP Batch Image Converter
將 img 目錄下的 JPG、PNG 圖片批次轉換為 WebP 格式
支援進度條顯示、圖片縮放、轉換後自動刪除原檔
"""

import os
import sys
import argparse
from PIL import Image

def progress_bar(current, total, bar_length=40, prefix="進度"):
    """顯示進度條"""
    percent = current / total if total > 0 else 1
    filled = int(bar_length * percent)
    bar = "█" * filled + "░" * (bar_length - filled)
    percent_str = f"{percent * 100:.1f}%"
    print(f"\r{prefix}: |{bar}| {percent_str} ({current}/{total})", end="", flush=True)
    if current >= total:
        print()  # 換行

def convert_image(file_path, quality=85, max_side=1600, delete_original=False):
    """轉換單張圖片為 WebP"""
    try:
        file_path = os.path.abspath(file_path)
        dir_name = os.path.dirname(file_path)
        base_name = os.path.basename(file_path)
        name, _ = os.path.splitext(base_name)
        
        output_path = os.path.join(dir_name, f"{name}.webp")
        
        with Image.open(file_path) as img:
            w, h = img.size
            
            # 等比例縮放
            if max(w, h) > max_side:
                if w > h:
                    new_w, new_h = max_side, int(h * (max_side / w))
                else:
                    new_w, new_h = int(w * (max_side / h)), max_side
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            # 儲存為 WebP
            img.save(output_path, 'WEBP', quality=quality)
            
        if delete_original:
            os.remove(file_path)
            
        return True
    except Exception as e:
        return False

def batch_convert(directory, quality=85, max_side=1600, delete_original=False):
    """批次轉換目錄中的圖片"""
    directory = os.path.abspath(directory)
    if not os.path.isdir(directory):
        print(f"[錯誤] 找不到目錄: {directory}")
        return
    
    target_extensions = ('.jpg', '.jpeg', '.png')
    
    # 先收集所有圖片
    images = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in target_extensions:
                images.append(os.path.join(root, file))
    
    total = len(images)
    
    if total == 0:
        print("✓ 沒有找到需要轉換的圖片")
        return
    
    print(f"找到 {total} 張圖片")
    print(f"品質: {quality} | 最大邊長: {max_side}px | 刪除原檔: {'是' if delete_original else '否'}")
    print("-" * 50)
    
    success = 0
    failed = 0
    
    for i, file_path in enumerate(sorted(images), 1):
        progress_bar(i, total, prefix="轉換中")
        if convert_image(file_path, quality, max_side, delete_original):
            success += 1
        else:
            failed += 1
    
    print("-" * 50)
    print(f"✅ 完成！成功: {success} | 失敗: {failed}")

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    
    parser = argparse.ArgumentParser(description="批次將圖片轉換為 WebP 格式")
    parser.add_argument("--dir", default="img", help="圖片目錄 (預設: img)")
    parser.add_argument("--quality", type=int, default=85, help="WebP 品質 1-100 (預設: 85)")
    parser.add_argument("--max-side", type=int, default=1600, help="最大邊長像素 (預設: 1600)")
    parser.add_argument("--delete", action="store_true", help="轉換成功後刪除原檔")
    
    args = parser.parse_args()
    
    target_dir = args.dir
    if not os.path.isabs(target_dir):
        target_dir = os.path.join(os.getcwd(), target_dir)
    
    batch_convert(target_dir, args.quality, args.max_side, args.delete)