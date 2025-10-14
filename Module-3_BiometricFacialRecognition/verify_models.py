"""
verify_models.py
----------------
Quick test script to confirm MTCNN + FaceNet are installed,
load correctly, and generate valid embeddings.
"""

import torch
import numpy as np
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResNetV1

def main():
    print("=" * 60)
    print("✅ Facial Recognition Environment Verification")
    print("=" * 60)

    # Select device (CPU for Raspberry Pi / Mac)
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"[INFO] Using device: {device}")

    # Initialize MTCNN detector
    print("\n[STEP 1] Initializing MTCNN...")
    mtcnn = MTCNN(keep_all=True, device=device)
    print("[OK] MTCNN initialized successfully")

    # Initialize FaceNet model
    print("\n[STEP 2] Loading FaceNet model (VGGFace2 weights)...")
    model = InceptionResNetV1(pretrained='vggface2').eval().to(device)
    print("[OK] FaceNet model loaded")

    # Generate a dummy test image (simulate a random face)
    print("\n[STEP 3] Generating dummy image...")
    dummy_image = np.random.randint(0, 255, (160, 160, 3), dtype=np.uint8)
    image = Image.fromarray(dummy_image)
    print("[OK] Dummy image generated")

    # Run through FaceNet to test embedding
    print("\n[STEP 4] Getting embedding from FaceNet...")
    with torch.no_grad():
        img_tensor = torch.tensor(np.array(image)).permute(2, 0, 1).unsqueeze(0).float()
        img_tensor = (img_tensor / 127.5) - 1.0  # normalize to [-1,1]
        embedding = model(img_tensor.to(device)).detach().cpu().numpy()

    print(f"[OK] Embedding generated successfully, shape: {embedding.shape}")
    print(f"First 5 values: {embedding.flatten()[:5]}")
    print("=" * 60)
    print("🎉 MTCNN + FaceNet setup verified successfully!")

if __name__ == "__main__":
    main()
