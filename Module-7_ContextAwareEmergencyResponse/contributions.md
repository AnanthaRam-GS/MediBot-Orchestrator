FallDetection module members:

CB.SC.U4CSE23006 - Ajay N Mukunth

CB.SC.U4CSE23010 - BC Sakthi Karthik 

CB.SC.U4CSE23035 - Kanha

CB.SC.U4CSE23045 - R.Vishal



individual contributions:

Ajay N Mukunth:

Object Detection and Tracking
This member's focus is on detecting people in a video stream and assigning a consistent ID to each person across different frames. This is the first crucial step in the pipeline.

Files Allotted:
yolov8n.pt: This is the pre-trained YOLOv8n object detection model. Its job is to scan each frame of the video and identify the location of people by drawing bounding boxes around them.


sort.py: This script implements the SORT (Simple Online and Realtime Tracking) algorithm. It takes the bounding boxes from YOLO and uses a Kalman filter to predict movement, allowing it to track the same person from one frame to the next and assign them a persistent ID.


BC Sakthi Karthik:

This member is responsible for analyzing the posture of a detected person to extract meaningful data points (features) that can be used to determine if they are standing, sitting, or lying down.

Files Allotted:

updatedDetector.py (Partial): Focus on the MediaPipePoseWrapper class and the helper functions compute_torso_angle and label_posture_from_keypoints.

fall_evidence/id15_20251014_095416_kpts.json: This JSON file is an example of the output from this module. It contains a time-stamped log of keypoints (kpts), posture, and torso angle for a specific person (ID 15).

Kanha:

Fall Detection Logic and State Management

This member will focus on the "brain" of the system—the logic that analyzes the features over time to decide if a fall has occurred. This involves managing a state machine for each tracked person.

Files Allotted:

updatedDetector.py (Partial): Focus on the PersonBuffer class and the state transition logic inside the main while loop.

fall_evidence/fall_evidence1.jpg: This image shows a person with the "FALL_SUSPECTED" status, which is the first state in the fall detection process.

R.Vishal:

This member is responsible for the overall pipeline, integrating all the components, and managing the final output, which includes saving evidence and generating alerts.

Files Allotted:

updatedDetector.py (Main Structure): Focus on the run_fall_detector function, the main while loop structure, and the functions dump_evidence and create_emergency_alert.


fall_evidence/id15_20251014_095416_crop.jpg: This is an example of a cropped image that is saved as "evidence" when a fall is confirmed

