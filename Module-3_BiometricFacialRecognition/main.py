"""
Main Integration Script for Facial Recognition Module (Module 3)
---------------------------------------------------------------
Functions:
- Real-time Face Detection & Alignment (MTCNN)
- Face Embedding Extraction (FaceNet)
- MySQL Integration for Storage & Recognition
- Auto Patient ID generation (starts from 1000)
- Import pre-captured face images from folder (Press 'i')
"""

import cv2
import numpy as np
import time
import os
from models.mtcnn_detector import FaceDetectorAligner
from models.facenet_model import FaceNetEmbedder
from database.db_operations import FaceDB


def main():
    print("=" * 65)
    print(" HUMANOID ROBOT - MODULE 3 : FACIAL RECOGNITION SYSTEM ")
    print("=" * 65)

    # Initialize models
    print("\n[INFO] Initializing MTCNN + FaceNet...")
    detector = FaceDetectorAligner(output_size=(160, 160))
    embedder = FaceNetEmbedder(device='cpu')
    db = FaceDB(host="10.147.145.165", user="robot_user", password="robot_pass", database="robot_db")
    print("[INFO] Initialization complete.\n")

    # Start webcam
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    if not cap.isOpened():
        print("[ERROR] Could not access webcam!")
        return

    print("Controls:\n"
          "  [q] Quit\n"
          "  [s] Save faces\n"
          "  [r] Recognize\n"
          "  [n] New patient registration\n"
          "  [i] Import existing face images\n")

    frame_count = 0
    last_detected_faces = []
    last_overlay = []        # store last recognized results
    overlay_timestamp = 0    # when last overlay was updated

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Frame capture failed.")
            break

        frame_count += 1
        if frame_count % 3 == 0:  # process every 3rd frame
            processed_frame, aligned_faces = detector.process_frame(frame, draw_boxes=True)
            last_detected_faces = aligned_faces
        else:
            processed_frame = frame

        face_count = len(last_detected_faces)
        cv2.putText(processed_frame, f"Faces: {face_count}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        # ✅ draw overlay text for ~2 seconds after recognition
        if time.time() - overlay_timestamp < 2 and detector.last_boxes and last_overlay:
            for (x1, y1, x2, y2), (line1, line2, color) in zip(detector.last_boxes, last_overlay):
                cv2.putText(processed_frame, line1, (x1, y2 + 25),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
                if line2:
                    cv2.putText(processed_frame, line2, (x1, y2 + 50),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        # ✅ SHOW THE LIVE CAMERA WINDOW
        cv2.imshow("Facial Recognition System", processed_frame)

        # Read key input
        key = cv2.waitKey(1) & 0xFF

        # Quit
        if key == ord('q'):
            print("\n[INFO] Exiting system...")
            break

        # Save aligned faces
        if key == ord('s') and face_count > 0:
            timestamp = int(time.time())
            for i, face in enumerate(last_detected_faces):
                filename = f"data/aligned_faces/face_{timestamp}_{i}.jpg"
                face_bgr = cv2.cvtColor(face, cv2.COLOR_RGB2BGR)
                cv2.imwrite(filename, face_bgr)
                print(f"[SAVED] {filename}")

        # Recognize faces
        elif key == ord('r') and face_count > 0:
            print(f"\n[INFO] Recognizing {face_count} face(s)...")
            last_overlay = []  # clear previous overlay
            for idx, face in enumerate(last_detected_faces):
                embedding = embedder.get_embedding(face)
                identity = db.match_face(embedding, threshold=0.7)
                print(f"Face {idx+1}: {identity}")

                # Build display message
                if identity != "Unknown" and identity != "Database Empty":
                    try:
                        name, pid = identity.split(" (ID: ")
                        pid = pid.replace(")", "")
                        line1 = f"Hello, {name.strip()}!"
                        line2 = f"Your Patient ID: {pid.strip()}"
                        color = (0, 255, 0)
                    except Exception:
                        line1, line2, color = f"Hello, {identity}!", "", (0, 255, 0)
                else:
                    line1, line2, color = "Unknown Face", "", (0, 0, 255)

                last_overlay.append((line1, line2, color))

            overlay_timestamp = time.time()
            print("----------------------------------------------------")

        # Register new patient (from webcam)
        elif key == ord('n') and face_count > 0:
            print("\n[NEW PATIENT REGISTRATION]")
            name = input("Enter Patient Name: ").strip()
            if name == "":
                print("[ERROR] Name cannot be empty!")
                continue

            face = last_detected_faces[0]
            embedding = embedder.get_embedding(face)
            db.insert_user(name, embedding)
            print(f"[INFO] Patient '{name}' registered successfully!\n")
            print("----------------------------------------------------")

        # Import pre-captured images from folder
        elif key == ord('i'):
            print("\n[IMPORT EXISTING FACES FROM FOLDER]")
            folder_path = "dataset_import"  # Folder containing clear face images
            if not os.path.exists(folder_path):
                print(f"[ERROR] Folder '{folder_path}' not found!")
                continue

            image_files = [f for f in os.listdir(folder_path)
                           if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

            if not image_files:
                print(f"[INFO] No images found in '{folder_path}'.")
                continue

            print(f"[INFO] Found {len(image_files)} image(s) in '{folder_path}'")

            for file in image_files:
                path = os.path.join(folder_path, file)
                name = os.path.splitext(file)[0]

                image = cv2.imread(path)
                if image is None:
                    print(f"[WARN] Skipping unreadable file: {file}")
                    continue

                processed_frame, aligned_faces = detector.process_frame(image, draw_boxes=False)
                if not aligned_faces:
                    print(f"[WARN] No face detected in {file}. Skipping.")
                    continue

                face = aligned_faces[0]
                embedding = embedder.get_embedding(face)
                db.insert_user(name, embedding)
                print(f"[IMPORTED] Added '{name}' from {file}")

            print("[INFO] All valid faces imported successfully!\n")

    # Cleanup
    cap.release()
    db.close()
    cv2.destroyAllWindows()
    print("[INFO] Program terminated successfully.")


if __name__ == "__main__":
    main()
