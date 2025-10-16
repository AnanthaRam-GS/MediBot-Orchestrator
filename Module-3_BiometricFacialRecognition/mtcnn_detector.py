"""
Face Detection and Alignment Module for Humanoid Robot
This module detects faces using MTCNN and aligns them for FaceNet feature extraction.
Optimized for Raspberry Pi and webcam usage.
"""

import cv2
import numpy as np
from facenet_pytorch import MTCNN
import os
from datetime import datetime


class FaceDetectorAligner:
    """
    Handles face detection and alignment for integration with FaceNet.
    """

    def __init__(self, output_size=(160, 160)):
        """
        Initialize the face detector and aligner.
        """
        print("Initializing MTCNN detector...")
        self.detector = MTCNN(keep_all=True, post_process=False)
        self.output_size = output_size

        # 🔹 Store the last known bounding boxes for overlay in main.py
        self.last_boxes = None

        print("MTCNN detector initialized successfully!")

    # -----------------------------------------------------------
    def detect_faces(self, frame):
        """Detect faces in a frame using MTCNN."""
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        boxes, probs, keypoints = self.detector.detect(rgb_frame, landmarks=True)
        detections = []
        if boxes is not None:
            for box, prob, kps in zip(boxes, probs, keypoints):
                detections.append({
                    "box": box.tolist(),
                    "confidence": float(prob),
                    "keypoints": {
                        "left_eye": kps[0],
                        "right_eye": kps[1],
                        "nose": kps[2],
                        "mouth_left": kps[3],
                        "mouth_right": kps[4],
                    },
                })
        return detections

    # -----------------------------------------------------------
    def align_face(self, frame, detection):
        """Align a detected face using facial landmarks."""
        try:
            left_eye = detection["keypoints"]["left_eye"]
            right_eye = detection["keypoints"]["right_eye"]

            # Compute rotation angle
            dy = right_eye[1] - left_eye[1]
            dx = right_eye[0] - left_eye[0]
            angle = np.degrees(np.arctan2(dy, dx))

            # Compute eye center
            eye_center = (
                int((left_eye[0] + right_eye[0]) / 2),
                int((left_eye[1] + right_eye[1]) / 2),
            )

            # Rotate frame around eye center
            rotation_matrix = cv2.getRotationMatrix2D(eye_center, angle, 1.0)
            rotated = cv2.warpAffine(frame, rotation_matrix, (frame.shape[1], frame.shape[0]))

            # Crop using bounding box
            x1, y1, x2, y2 = map(int, detection["box"])
            face = rotated[y1:y2, x1:x2]

            if face.size == 0:
                return None

            aligned = cv2.resize(face, self.output_size)
            aligned_rgb = cv2.cvtColor(aligned, cv2.COLOR_BGR2RGB)
            return aligned_rgb

        except Exception as e:
            print(f"Error during face alignment: {e}")
            return None

    # -----------------------------------------------------------
    def process_frame(self, frame, draw_boxes=True):
        """
        Process a single frame: detect and align all faces.
        """
        detections = self.detect_faces(frame)
        aligned_faces = []
        boxes = []  # 🔹 store bounding boxes for overlay in main.py

        for detection in detections:
            # Extract bounding box and confidence
            box = detection["box"]
            confidence = detection["confidence"]

            # Convert to integer coordinates
            x1, y1, x2, y2 = map(int, box)
            boxes.append((x1, y1, x2, y2))

            # --- Draw bounding box and confidence ---
            if draw_boxes:
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                text = f"{confidence:.2f}"
                cv2.putText(frame, text, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

                # Draw keypoints if available
                if "keypoints" in detection:
                    for key, point in detection["keypoints"].items():
                        cv2.circle(frame, (int(point[0]), int(point[1])), 2, (0, 0, 255), 2)

            # --- Align or crop the face ---
            aligned_face = None
            try:
                if "keypoints" in detection:
                    aligned_face = self.align_face(frame, detection)
                else:
                    aligned_face = frame[y1:y2, x1:x2]
            except Exception as e:
                print(f"Error during face alignment: {e}")

            if aligned_face is not None:
                aligned_faces.append(aligned_face)

        # --- Save latest bounding boxes for overlay logic ---
        self.last_boxes = boxes if boxes else None

        return frame, aligned_faces
