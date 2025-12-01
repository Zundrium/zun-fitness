import os
import argparse
from PIL import Image
from super_image import EdsrModel, ImageLoader
from tqdm import tqdm
import torch
import numpy as np

def upscale_images(scale=2, model_name='eugenesiow/edsr-base'):
    input_dir = os.path.join('static', 'activities', 'small')
    output_dir = os.path.join('static', 'activities')
    
    if not os.path.exists(input_dir):
        print(f"Error: Input directory '{input_dir}' does not exist.")
        return

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Loading model: {model_name} with scale {scale}...")
    try:
        model = EdsrModel.from_pretrained(model_name, scale=scale)
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    # Get list of files
    files = [f for f in os.listdir(input_dir) if f.lower().endswith(('.webp', '.png', '.jpg', '.jpeg'))]
    
    if not files:
        print("No image files found in input directory.")
        return

    print(f"Found {len(files)} images to upscale.")

    # Determine resampling method compatibility
    if hasattr(Image, 'Resampling'):
        resample_method = Image.Resampling.LANCZOS
    else:
        resample_method = Image.LANCZOS

    for filename in tqdm(files, desc="Upscaling images"):
        input_path = os.path.join(input_dir, filename)
        output_path = os.path.join(output_dir, filename)
        
        try:
            original_image = Image.open(input_path)
            
            # Handle transparency: Create white background
            if original_image.mode in ('RGBA', 'LA') or (original_image.mode == 'P' and 'transparency' in original_image.info):
                original_image = original_image.convert('RGBA')
                background = Image.new('RGB', original_image.size, (255, 255, 255))
                # Paste the image on the background using alpha channel as mask
                background.paste(original_image, mask=original_image.split()[3]) 
                rgb_image = background
            else:
                rgb_image = original_image.convert('RGB')
            
            # Upscale RGB image
            inputs = ImageLoader.load_image(rgb_image)
            preds = model(inputs)
            
            # Save image
            ImageLoader.save_image(preds, output_path)
                
        except Exception as e:
            print(f"Failed to upscale {filename}: {e}")

    print("Upscaling complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Upscale images using super-image.')
    parser.add_argument('--scale', type=int, default=2, help='Upscaling scale (2, 3, or 4)')
    parser.add_argument('--model', type=str, default='eugenesiow/edsr-base', help='Model name')
    
    args = parser.parse_args()
    
    upscale_images(scale=args.scale, model_name=args.model)
