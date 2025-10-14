"""
FaceNet Embedding Extraction Module
-----------------------------------
Generates 512-dimensional embeddings using facenet-pytorch's InceptionResNetV1.
Optimized for Raspberry Pi 4 (CPU inference, no gradients).
"""

import torch
import numpy as np
from facenet_pytorch import InceptionResnetV1
import cv2

class FaceNetEmbedder:
    def __init__(self, device=None):
        """
        Initialize the FaceNet model.

        Args:
            device: 'cpu' or 'cuda'. Defaults to CPU for Raspberry Pi.
        """
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"[FaceNet] Using device: {self.device}")

        # Load pretrained model (VGGFace2 weights)
        self.model = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)
        print("[FaceNet] Model loaded successfully!")

    def preprocess(self, face_img):
        """
        Convert an aligned face (numpy RGB) to a normalized torch tensor.

        Args:
            face_img: numpy array (160x160x3, RGB)

        Returns:
            torch tensor (1x3x160x160) normalized to [-1, 1]
        """
        if face_img is None:
            return None

        # Ensure size is 160x160
        face_resized = cv2.resize(face_img, (160, 160))
        # Convert to float32 and normalize to [-1, 1]
        face_norm = (face_resized / 127.5) - 1.0
        # Rearrange dimensions to (C, H, W)
        face_tensor = torch.from_numpy(face_norm.transpose(2, 0, 1)).float()
        return face_tensor.unsqueeze(0)  # Add batch dimension

    @torch.no_grad()
    def get_embedding(self, face_img):
        """
        Generate embedding for a single face.

        Args:
            face_img: numpy array (160x160x3, RGB)

        Returns:
            embedding: 512-D numpy array
        """
        tensor = self.preprocess(face_img)
        if tensor is None:
            return None
        tensor = tensor.to(self.device)

        embedding = self.model(tensor)
        embedding = embedding.cpu().numpy().flatten()
        # Normalize L2
        embedding = embedding / np.linalg.norm(embedding)
        return embedding

    @torch.no_grad()
    def get_embeddings_batch(self, face_list):
        """
        Generate embeddings for multiple faces.

        Args:
            face_list: list of numpy RGB faces

        Returns:
            List of 512-D numpy arrays
        """
        embeddings = []
        for face in face_list:
            emb = self.get_embedding(face)
            if emb is not None:
                embeddings.append(emb)
        return embeddings


# Stand-alone test
if __name__ == "__main__":
    from time import time

    print("=== FaceNet Embedding Test ===")
    embedder = FaceNetEmbedder(device='cpu')

    # Example: load an aligned face
    img_path = "../data/aligned_faces/sample.jpg"
    img = cv2.imread(img_path)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    t0 = time()
    embedding = embedder.get_embedding(img_rgb)
    t1 = time()

    print(f"Embedding length: {len(embedding)}")
    print(f"Computation time: {(t1 - t0):.3f}s")
    print("First 5 dims:", embedding[:5])
