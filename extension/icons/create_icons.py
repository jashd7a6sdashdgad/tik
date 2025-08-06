#!/usr/bin/env python3
"""
Simple script to create placeholder icons for the Chrome extension.
In a real implementation, you'd use proper designed icons.
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    # Create a new image with a gradient background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Create gradient background
    for i in range(size):
        color = (
            int(102 + (118 - 102) * i / size),  # From #667eea to #764ba2
            int(126 + (75 - 126) * i / size),
            int(234 + (162 - 234) * i / size),
            255
        )
        draw.line([(0, i), (size, i)], fill=color)
    
    # Add a simple icon (letter P for Personal Assistant)
    try:
        # Try to use a decent font
        font_size = size // 2
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        # Fallback to default font
        font = ImageFont.load_default()
    
    # Draw the letter P
    text = "PA"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    # Save the image
    img.save(filename, 'PNG')
    print(f"Created {filename} ({size}x{size})")

def main():
    # Check if PIL is available
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("PIL/Pillow not available. Creating simple text files as placeholders.")
        # Create placeholder files
        for size, filename in [(16, 'icon16.png'), (48, 'icon48.png'), (128, 'icon128.png')]:
            with open(filename, 'w') as f:
                f.write(f"Placeholder icon {size}x{size}")
        return
    
    # Create icons
    create_icon(16, 'icon16.png')
    create_icon(48, 'icon48.png')
    create_icon(128, 'icon128.png')

if __name__ == '__main__':
    main()