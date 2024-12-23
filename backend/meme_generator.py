from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display
import os
from typing import Optional

class MemeGenerator:
    def __init__(self, font_path: Optional[str] = None):
        """
        Initialize the MemeGenerator with an optional custom font path.
        If no font path is provided, it will use a default system font.
        """
        # A font that supports Hebrew (e.g. Arial Unicode, etc.)
        self.font_path = font_path or "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
    
    def _reshape_rtl(self, text: str) -> str:
        """
        Reshape & reorder Hebrew/Arabic text so it displays properly without libraqm.
        """
        # If you only have Hebrew letters/spaces (no punctuation), you can
        # skip arabic_reshaper; just do: return get_display(text).
        reshaped_text = arabic_reshaper.reshape(text)
        bidi_text = get_display(reshaped_text)
        return bidi_text
    
    def _get_same_font_size(
        self, top_text: str, bottom_text: str, 
        width: int, height: int, draw: ImageDraw.Draw,
        max_width_ratio: float = 0.9, 
        top_bottom_margin_ratio: float = 0.1
    ) -> int:
        """
        Find the largest single font size S that fits BOTH lines in:
          - <= max_width_ratio * width
          - The total height for both lines (plus a small gap) 
            fits within the height minus top/bottom margins.

        Returns:
            int: The largest font size that fits the criteria.
        """
        # The maximum available width for text:
        max_text_width = width * max_width_ratio
        
        # The vertical space we have for BOTH lines combined
        # after leaving top_bottom_margin_ratio from top & bottom.
        vertical_space = height * (1 - 2 * top_bottom_margin_ratio)
        
        font_size = 1
        best_size = 1
        gap = 10  # some gap/padding between the two lines, in pixels

        while True:
            font = ImageFont.truetype(self.font_path, font_size)
            
            # Measure the two lines
            top_bbox = draw.textbbox((0, 0), top_text, font=font)
            top_w = top_bbox[2] - top_bbox[0]
            top_h = top_bbox[3] - top_bbox[1]

            bottom_bbox = draw.textbbox((0, 0), bottom_text, font=font)
            bottom_w = bottom_bbox[2] - bottom_bbox[0]
            bottom_h = bottom_bbox[3] - bottom_bbox[1]

            # Check widths
            if top_w > max_text_width or bottom_w > max_text_width:
                break
            
            # Check total height usage
            total_text_height = top_h + gap + bottom_h
            if total_text_height > vertical_space:
                break

            best_size = font_size
            font_size += 1
        
        return best_size
    
    def create_meme(self, image_path: str, top_text: str, bottom_text: str, output_path: str) -> str:
        # 1) Reshape text for RTL
        top_text = self._reshape_rtl(top_text)
        bottom_text = self._reshape_rtl(bottom_text)
        
        with Image.open(image_path) as img:
            # Convert to RGB if necessary
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            draw = ImageDraw.Draw(img)
            
            width, height = img.size

            # 2) Determine a single font size that fits both lines
            font_size = self._get_same_font_size(top_text, bottom_text, width, height, draw)
            font = ImageFont.truetype(self.font_path, font_size)
            
            # 3) Measure actual bounding boxes with that font
            gap = 10  # gap between top and bottom text
            top_bbox = draw.textbbox((0, 0), top_text, font=font)
            top_w = top_bbox[2] - top_bbox[0]
            top_h = top_bbox[3] - top_bbox[1]

            bottom_bbox = draw.textbbox((0, 0), bottom_text, font=font)
            bottom_w = bottom_bbox[2] - bottom_bbox[0]
            bottom_h = bottom_bbox[3] - bottom_bbox[1]

            # 4) Decide vertical positions so they're not cropped
            #    We’ll place top text ~10% from the top, bottom text ~10% from the bottom.
            margin_y = int(height * 0.1)  # 10% margin from top/bottom
            top_y = margin_y  # top line starts 10% down
            bottom_y = height - margin_y - bottom_h  # bottom line ends 10% from the bottom

            # 5) Center horizontally
            top_x = (width - top_w) // 2
            bottom_x = (width - bottom_w) // 2
            
            # 6) Draw the top text with outline/stroke
            stroke_width = 2
            for offset in [(-stroke_width, 0), (stroke_width, 0), (0, -stroke_width), (0, stroke_width)]:
                draw.text((top_x + offset[0], top_y + offset[1]), top_text, font=font, fill="black")
            draw.text((top_x, top_y), top_text, font=font, fill="white")
            
            # 7) Draw the bottom text with outline/stroke
            for offset in [(-stroke_width, 0), (stroke_width, 0), (0, -stroke_width), (0, stroke_width)]:
                draw.text((bottom_x + offset[0], bottom_y + offset[1]), bottom_text, font=font, fill="black")
            draw.text((bottom_x, bottom_y), bottom_text, font=font, fill="white")
            
            # 8) Save the meme
            img.save(output_path, quality=95)
        
        return output_path


if __name__ == "__main__":
    generator = MemeGenerator()
    result = generator.create_meme(
        "backend/9au02y.jpg",
        "טקסט עליוןעליוןעליוןעליוןעליוןעליון",
        "טקסט תחתוןתחתוןתחתוןתחתוןתחתון",
        "output_meme.jpg"
    )
    print("Meme saved to:", result)
