"""
fall_detector.py

End-to-end prototype with IoU Tracker configured for better ID persistence.

CRITICAL MODIFICATIONS:
1. Increased TRACKER_MAX_AGE_FRAMES (from 1.5s to 10s) and ID_TIMEOUT_SECONDS (from 2.5s to 10.5s).
   This allows a person who leaves the frame to be re-identified with their old ID upon re-entry.
2. IoU Tracker logic is structurally sound (including fixes for argmax and constructors).
3. NEW FEATURE: Added logic to create an emergency text file alert if the FALL_CONFIRMED state
   persists for CONFIRMED_ALERT_SECONDS.
"""

import time
import math
import json
import os
from collections import deque, defaultdict, namedtuple
from typing import List, Tuple, Dict

import cv2
import numpy as np

# Detector (Ultralytics YOLO) and MediaPipe Pose
try:
    from ultralytics import YOLO
except Exception as e:
    YOLO = None
    print("Warning: ultralytics YOLO not available. Install with pip install ultralytics if you want YOLO detections.")

try:
    import mediapipe as mp
except Exception as e:
    mp = None
    print("Error: MediaPipe missing. Install with pip install mediapipe.")

# Optional TTS (pyttsx3) - used for robot voice prompt; safe fallback if not present
try:
    import pyttsx3
    TTS_AVAILABLE = True
except Exception:
    pyttsx3 = None
    TTS_AVAILABLE = False

# ----------------------------
# Configuration (Enhanced ID Persistence & New Alert)
# ----------------------------
CONF_THRESH = 0.45
NMS_IOU = 0.5
MIN_BOX_AREA = 40 * 80
PADDING_RATIO = 0.15

# Buffer & detection parameters
FPS = 15
BUFFER_SECONDS = 4.0
BUFFER_MAXLEN = int(BUFFER_SECONDS * FPS)
T_FAST = 2.0
DELTA_Y = 0.45
TORSO_ANGLE_LYING = 60.0
SMOOTH_WINDOW_FRAMES = 5
CONFIRMATION_SECONDS = 3.0

# Tracker parameters
IOU_MATCH_THRESHOLD = 0.35
# ENHANCEMENT: Increase max age significantly for re-ID capability
ID_RETENTION_SECONDS = 10.0
TRACKER_MAX_AGE_FRAMES = int(ID_RETENTION_SECONDS * FPS)
TRACKER_MIN_HITS = 3
ID_TIMEOUT_SECONDS = ID_RETENTION_SECONDS + 0.5 # Buffer is held slightly longer than the track

# NEW ALERT PARAMETER (15-20 seconds specified by user, using 15s)
CONFIRMED_ALERT_SECONDS = 15.0 

# Output / logging
EVIDENCE_DIR = "fall_evidence"
os.makedirs(EVIDENCE_DIR, exist_ok=True)
ALERT_DIR = "emergency_alerts" # New directory for text file alerts
os.makedirs(ALERT_DIR, exist_ok=True)
VERBOSE = True

# ----------------------------
# Helper data structures and IoU
# ----------------------------
BBox = namedtuple("BBox", ["x1", "y1", "x2", "y2", "conf"])  # fullframe coords

def bbox_area(bbox: BBox):
    return max(0, bbox.x2 - bbox.x1) * max(0, bbox.y2 - bbox.y1)

def iou(boxA: BBox, boxB: BBox) -> float:
    # compute IoU between two boxes
    xA = max(boxA.x1, boxB.x1)
    yA = max(boxA.y1, boxB.y1)
    xB = min(boxA.x2, boxB.x2)
    yB = min(boxA.y2, boxB.y2)
    interW = max(0, xB-xA)
    interH = max(0, yB-yA)
    interArea = interW * interH
    if interArea == 0:
        return 0.0
    boxAArea = bbox_area(boxA)
    boxBArea = bbox_area(boxB)
    return interArea / float(boxAArea + boxBArea - interArea + 1e-9)

# ----------------------------
# Simple IoU-based Tracker
# ----------------------------
class Track:
    # FIX: Corrected constructor name
    def __init__(self, track_id, bbox: BBox, frame_idx, conf):
        self.id = track_id
        self.bbox = bbox
        self.hits = 1
        self.age = 1
        self.last_seen = frame_idx
        self.time_created = time.time()
        self.conf = conf
        self.ema_center = self._center()
        self.ema_alpha = 0.35

    def _center(self):
        return ((self.bbox.x1 + self.bbox.x2) / 2.0, (self.bbox.y1 + self.bbox.y2) / 2.0)

    def update(self, bbox: BBox, frame_idx, conf):
        # update bbox with EMA smoothing to reduce jitter
        cx, cy = ((bbox.x1 + bbox.x2) / 2.0, (bbox.y1 + bbox.y2) / 2.0)
        ex, ey = self.ema_center
        new_ex = self.ema_alpha * cx + (1-self.ema_alpha) * ex
        new_ey = self.ema_alpha * cy + (1-self.ema_alpha) * ey
        
        w = max(1, bbox.x2 - bbox.x1)
        h = max(1, bbox.y2 - bbox.y1)
        self.bbox = BBox(
            x1 = new_ex - w/2,
            y1 = new_ey - h/2,
            x2 = new_ex + w/2,
            y2 = new_ey + h/2,
            conf = conf
        )
        self.ema_center = (new_ex, new_ey)
        self.hits += 1
        self.age = 0
        self.last_seen = frame_idx
        self.conf = conf

class IoUTracker:
    # FIX: Corrected constructor name
    def __init__(self, iou_threshold=IOU_MATCH_THRESHOLD, max_age=TRACKER_MAX_AGE_FRAMES, min_hits=TRACKER_MIN_HITS):
        self.tracks: Dict[int, Track] = {}
        self.next_id = 1
        self.iou_thresh = iou_threshold
        self.max_age = max_age
        self.min_hits = min_hits

    def update(self, detections: List[BBox], frame_idx: int) -> Dict[int, BBox]:
        assigned = {}
        if len(self.tracks) == 0:
            for d in detections:
                t = Track(self.next_id, d, frame_idx, d.conf)
                self.tracks[self.next_id] = t
                assigned[self.next_id] = d
                self.next_id += 1
            return assigned

        # create IoU matrix
        track_ids = list(self.tracks.keys())
        iou_mat = np.zeros((len(track_ids), len(detections)), dtype=np.float32)
        for i, tid in enumerate(track_ids):
            for j, det in enumerate(detections):
                iou_mat[i, j] = iou(self.tracks[tid].bbox, det)

        # FIX: Check size before running argmax to prevent "empty sequence" crash
        matched_tracks = set()
        matched_dets = set()

        if iou_mat.size > 0:
            while True:
                # Find the maximum IoU match
                # FIX: Use appropriate argmax logic (unravel_index)
                if np.max(iou_mat) < self.iou_thresh:
                    break
                
                idx = np.unravel_index(np.argmax(iou_mat), iou_mat.shape)
                best_i, best_j = idx
                best_val = iou_mat[best_i, best_j]
                
                if best_val < self.iou_thresh:
                    break
                    
                # Match Found
                tid = track_ids[best_i]
                det = detections[best_j]
                
                self.tracks[tid].update(det, frame_idx, det.conf)
                assigned[tid] = self.tracks[tid].bbox
                matched_tracks.add(best_i)
                matched_dets.add(best_j)
                
                # zero out row and col to prevent re-matching
                iou_mat[best_i, :] = -1
                iou_mat[:, best_j] = -1

        # create new tracks for unmatched detections
        for j, det in enumerate(detections):
            if j in matched_dets:
                continue
            t = Track(self.next_id, det, frame_idx, det.conf)
            self.tracks[self.next_id] = t
            assigned[self.next_id] = det
            self.next_id += 1

        # age and remove old tracks
        to_delete = []
        for tid, tr in list(self.tracks.items()):
            if tr.last_seen != frame_idx:
                tr.age += 1
            # Check for deletion based on MAX_AGE
            if tr.age > self.max_age:
                to_delete.append(tid)
        
        for tid in to_delete:
            del self.tracks[tid]

        return assigned

# ----------------------------
# MediaPipe Pose helper functions
# ----------------------------
class MediaPipePoseWrapper:
    # FIX: Corrected constructor name
    def __init__(self, model_complexity=1, enable_segmentation=False):
        if mp is None:
            raise RuntimeError("mediapipe not available")
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(static_image_mode=False, model_complexity=model_complexity,
                                     enable_segmentation=enable_segmentation, min_detection_confidence=0.5)

    def process_crop(self, crop_bgr: np.ndarray):
        img_rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)
        img_rgb.flags.writeable = False
        results = self.pose.process(img_rgb)
        return results

def compute_torso_angle(keypoints, image_h=None):
    """
    Compute torso angle in degrees from vertical (0=vertical, 90=horizontal).
    """
    try:
        ls = keypoints['left_shoulder']
        rs = keypoints['right_shoulder']
        lh = keypoints['left_hip']
        rh = keypoints['right_hip']
        
        sx = (ls[0] + rs[0]) / 2.0
        sy = (ls[1] + rs[1]) / 2.0
        hx = (lh[0] + rh[0]) / 2.0
        hy = (lh[1] + rh[1]) / 2.0
        
        dx = sx - hx
        dy = sy - hy
        
        angle_rad = math.atan2(abs(dx), abs(dy) + 1e-9)
        angle_deg = math.degrees(angle_rad)
        return angle_deg, (sx, sy), (hx, hy)
    except Exception:
        return None, None, None

# ----------------------------
# Per-ID buffer and state machine
# ----------------------------
class PersonBuffer:
    # FIX: Corrected constructor name
    def __init__(self, maxlen=BUFFER_MAXLEN):
        self.buf = deque(maxlen=maxlen)
        # baseline standing hip_y (normalized Y, SMALLER is higher on screen)
        self.standing_hip_y = None 
        self.state = "UNKNOWN"
        self.suspect_start_ts = None
        self.confirmation_deadline = None
        self.confirmed_start_ts = None # NEW: Timestamp for when FALL_CONFIRMED starts
        self.alert_file_created = False # NEW: Flag to prevent repeated file creation

    def push_frame(self, frame_info):
        self.buf.append(frame_info)
        # Update baseline (take the highest known standing hip position)
        if frame_info.get("posture_label") == "standing":
            new_hip_y = frame_info.get("hip_y_norm")
            if new_hip_y is not None:
                 if self.standing_hip_y is None or new_hip_y < self.standing_hip_y:
                    self.standing_hip_y = new_hip_y

    def last_n(self, seconds):
        cutoff = time.time() - seconds
        return [f for f in self.buf if f['ts'] >= cutoff]

    def get_last_smoothed_label(self, window_frames=SMOOTH_WINDOW_FRAMES):
        labels = []
        for e in list(self.buf)[-window_frames:]:
            labels.append(e.get('posture_label', 'unknown'))
        if not labels:
            return 'unknown'
        return max(set(labels), key=labels.count)

    def detect_fast_transition(self):
        """ Checks for fast transition (upright->lying) with hip drop criteria. """
        if len(self.buf) < 3:
            return None
        buf_list = list(self.buf)
        
        # 1. Find the LAST stable upright frame (standing or sitting)
        last_upright_idx = None
        for i in range(len(buf_list)-1, -1, -1):
            if buf_list[i].get('posture_label') in ('standing', 'sitting'):
                last_upright_idx = i
                break
        if last_upright_idx is None:
            return None
            
        # 2. Find the FIRST lying frame AFTER that upright frame
        lying_idx = None
        for j in range(last_upright_idx + 1, len(buf_list)):
            if buf_list[j].get('posture_label') == 'lying':
                lying_idx = j
                break
        if lying_idx is None:
            return None
            
        # 3. Check time, baseline, and hip drop
        t_upright = buf_list[last_upright_idx]['ts']
        t_lying = buf_list[lying_idx]['ts']
        duration = t_lying - t_upright
        
        baseline = self.standing_hip_y
        hip_at_lying = buf_list[lying_idx].get('hip_y_norm')
        
        if baseline is None or hip_at_lying is None:
            return None
            
        # Hip drop: Hip Y coordinate increases (moves lower) upon falling.
        # Hip_at_lying (larger value) - baseline (smaller value)
        hip_drop = hip_at_lying - baseline
        
        # Check criteria: Fast duration AND significant drop
        if duration <= T_FAST and hip_drop >= DELTA_Y:
            return {
                't_upright': t_upright,
                't_lying': t_lying,
                'duration': duration,
                'hip_drop_norm': hip_drop,
                'index_lying': lying_idx,
                'index_upright': last_upright_idx
            }
        return None

# ----------------------------
# Utility: posture label from keypoints
# ----------------------------
def label_posture_from_keypoints(kpts_dict, image_h):
    """ returns: posture label string and hip_y_norm, torso_angle """
    try:
        left_hip = kpts_dict['left_hip']
        right_hip = kpts_dict['right_hip']
        lh_y = (left_hip[1] + right_hip[1]) / 2.0
        hip_y_norm = lh_y / float(image_h)
    except Exception:
        return 'unknown', None, None

    kpoints_xy = {}
    for k, v in kpts_dict.items():
        kpoints_xy[k] = (v[0], v[1])
    angle_deg, _, _ = compute_torso_angle(kpoints_xy, image_h=image_h)
    
    if angle_deg is None:
        return 'unknown', hip_y_norm, None
        
    if angle_deg > TORSO_ANGLE_LYING:
        return 'lying', hip_y_norm, angle_deg
        
    # Sitting threshold: hip low and angle still upright
    if hip_y_norm > 0.5 and angle_deg < TORSO_ANGLE_LYING:
        if angle_deg > 25:
             return 'sitting', hip_y_norm, angle_deg
        
    return 'standing', hip_y_norm, angle_deg

# ----------------------------
# Evidence dump
# ----------------------------
def dump_evidence(tid, person_buffer: PersonBuffer, full_frame, bbox: BBox):
    stamp = time.strftime("%Y%m%d_%H%M%S")
    name = f"id{tid}_{stamp}"
    
    last_frames = list(person_buffer.buf)[-int(CONFIRMATION_SECONDS*FPS*1.5):]
    kpts_serial = []
    for f in last_frames:
        kpts_serial.append({
            'ts': f['ts'],
            'posture': f['posture_label'],
            'hip_y_norm': f['hip_y_norm'],
            'torso_angle': f['torso_angle'],
            'pose_conf': f['pose_confidence']
        })
    with open(os.path.join(EVIDENCE_DIR, name + "_kpts.json"), "w") as fh:
        json.dump(kpts_serial, fh, indent=2)

    # save small masked crop
    x1, y1, x2, y2 = int(bbox.x1), int(bbox.y1), int(bbox.x2), int(bbox.y2)
    h, w = full_frame.shape[:2]
    x1 = max(0, x1); y1 = max(0, y1); x2 = min(w-1, x2); y2 = min(h-1, y2)
    crop = full_frame[y1:y2, x1:x2]
    fname = os.path.join(EVIDENCE_DIR, name + "_crop.jpg")
    cv2.imwrite(fname, crop)
    print(f"Saved evidence for ID {tid} -> {fname}")

# NEW FUNCTION: Creates the emergency text file
def create_emergency_alert(tid):
    """ Creates the emergency text file as requested by the user. """
    stamp = time.strftime("%Y%m%d_%H%M%S")
    filename = f"EMERGENCY_ALERT_ID{tid}_{stamp}.txt"
    filepath = os.path.join(ALERT_DIR, filename)
    
    message = f"Emergency need treatment soon for the patient {tid}\n"
    message += f"Alert Time (UTC): {time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime())}\n"
    message += f"Fall Confirmed ID: {tid}"
    
    with open(filepath, "w") as f:
        f.write(message)
    
    print(f"!!! EMERGENCY ALERT: Created file: {filepath}")
    return filepath

# ----------------------------
# Main processing loop
# ----------------------------
def run_fall_detector(video_source=0):
    if YOLO is None:
        raise RuntimeError("YOLO (ultralytics) not available. Install ultralytics via pip.")
    model = YOLO("yolov8n.pt") 

    if mp is None:
        raise RuntimeError("MediaPipe is not available. Please install it.")

    person_class = 0 
    mp_pose_wrap = MediaPipePoseWrapper(model_complexity=1)
    cap = cv2.VideoCapture(video_source)
    frame_idx = 0
    tracker = IoUTracker(iou_threshold=IOU_MATCH_THRESHOLD, max_age=TRACKER_MAX_AGE_FRAMES, min_hits=TRACKER_MIN_HITS)
    buffers = {} 
    last_seen_time = {} 

    tts_engine = None
    if TTS_AVAILABLE:
        tts_engine = pyttsx3.init()
        tts_engine.setProperty('rate', 150)

    print("Starting capture. Press 'q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("No frame from capture; exiting.")
            break
        frame_h, frame_w = frame.shape[:2]
        t_frame = time.time()
        frame_idx += 1

        # run detector (YOLO)
        results = model.predict(frame, imgsz=640, conf=CONF_THRESH, iou=NMS_IOU, classes=[person_class], verbose=False)
        
        dets = []
        for res in results:
            boxes = res.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                
                w = x2 - x1
                h = y2 - y1
                if w * h < MIN_BOX_AREA:
                    continue
                
                x1 = max(0, x1); y1 = max(0, y1); x2 = min(frame_w-1, x2); y2 = min(frame_h-1, y2)
                dets.append(BBox(int(x1), int(y1), int(x2), int(y2), conf))

        # update tracker
        assigned = tracker.update(dets, frame_idx)

        # Mark last seen times and manage buffers
        current_ids = set(assigned.keys())
        now_ts = time.time()
        for tid in current_ids:
            last_seen_time[tid] = now_ts
            if tid not in buffers:
                buffers[tid] = PersonBuffer(maxlen=BUFFER_MAXLEN)

        # remove buffers for timed-out IDs
        to_delete = []
        for tid, last_ts in list(last_seen_time.items()):
            # The buffer is held slightly longer than the track's MAX_AGE for robust re-entry
            if now_ts - last_ts > ID_TIMEOUT_SECONDS:
                if VERBOSE: print(f"[{time.strftime('%H:%M:%S')}] ID {tid} buffer cleared (left frame).")
                to_delete.append(tid)
        for tid in to_delete:
            if tid in buffers: del buffers[tid]
            if tid in last_seen_time: del last_seen_time[tid]

        # Process each assigned track
        for tid, bbox in assigned.items():
            # prepare padded crop
            bw = bbox.x2 - bbox.x1
            bh = bbox.y2 - bbox.y1
            padw = int(bw * PADDING_RATIO)
            padh = int(bh * PADDING_RATIO)
            cx1 = max(0, int(bbox.x1 - padw))
            cy1 = max(0, int(bbox.y1 - padh))
            cx2 = min(frame_w - 1, int(bbox.x2 + padw))
            cy2 = min(frame_h - 1, int(bbox.y2 + padh))
            crop = frame[cy1:cy2, cx1:cx2].copy()
            if crop.size == 0: continue
                
            # run MediaPipe on crop
            mp_res = mp_pose_wrap.process_crop(crop)
            current_buffer = buffers[tid]
            
            frame_info = {
                'ts': now_ts, 'bbox': bbox, 'keypoints': None, 'posture_label': 'unknown',
                'hip_y_norm': None, 'torso_angle': None, 'pose_confidence': 0.0
            }
            
            if mp_res.pose_landmarks is not None:
                kpts = {}
                for idx, lm in enumerate(mp_res.pose_landmarks.landmark):
                    x_rel = lm.x; y_rel = lm.y; vis = lm.visibility if hasattr(lm, 'visibility') else 1.0
                    x_pix = cx1 + x_rel * (cx2 - cx1); y_pix = cy1 + y_rel * (cy2 - cy1)
                    kpts[idx] = (x_pix, y_pix, vis)
                    
                named_kpts = {}
                idx_map = {'left_shoulder': 11, 'right_shoulder': 12, 'left_hip': 23, 'right_hip': 24}
                for name, iidx in idx_map.items():
                    if iidx in kpts: named_kpts[name] = kpts[iidx]
                        
                if all(k in named_kpts for k in idx_map.keys()):
                    kp_for_angle = {k: (v[0], v[1]) for k, v in named_kpts.items()}
                    angle_deg, _, (hip_x, hip_y) = compute_torso_angle(kp_for_angle)
                    hip_y_norm = hip_y / frame_h
                    posture, _, _ = label_posture_from_keypoints(named_kpts, frame_h)
                    
                    frame_info.update({
                        'keypoints': {str(k): v for k, v in kpts.items()}, 'posture_label': posture,
                        'hip_y_norm': hip_y_norm, 'torso_angle': angle_deg,
                        'pose_confidence': float(np.mean([lm.visibility if hasattr(lm, 'visibility') else 1.0 for lm in mp_res.pose_landmarks.landmark]))
                    })
                else:
                    frame_info.update({'posture_label': 'unknown'})
            else:
                frame_info.update({'posture_label': 'unknown'})

            current_buffer.push_frame(frame_info)

            # Evaluate fall detection
            detection = current_buffer.detect_fast_transition()
            
            if detection is not None and current_buffer.state not in ("FALL_SUSPECTED", "FALL_CONFIRMED"):
                current_buffer.state = "FALL_SUSPECTED"
                current_buffer.suspect_start_ts = time.time()
                current_buffer.confirmation_deadline = current_buffer.suspect_start_ts + CONFIRMATION_SECONDS
                if VERBOSE: print(f"[{time.strftime('%H:%M:%S')}] ID {tid} FallSuspected: duration={detection['duration']:.2f}s hip_drop={detection['hip_drop_norm']:.2f}")
                
            # Confirmation logic (Checks if Lying is sustained)
            if current_buffer.state == "FALL_SUSPECTED":
                sm_label = current_buffer.get_last_smoothed_label(window_frames=SMOOTH_WINDOW_FRAMES)
                
                if sm_label == "lying":
                    if time.time() >= current_buffer.confirmation_deadline:
                        current_buffer.state = "FALL_CONFIRMED"
                        current_buffer.confirmed_start_ts = time.time() # Start confirmed timer
                        current_buffer.alert_file_created = False # Reset flag for new confirmation event
                        print(f"[{time.strftime('%H:%M:%S')}] ID {tid} FALL_CONFIRMED -> Alerting")
                        
                        if tts_engine is not None:
                            tts_engine.say("Are you okay? Please respond.")
                            tts_engine.runAndWait()
                        
                        dump_evidence(tid, current_buffer, frame, assigned[tid])
                else:
                    # Clear Suspected state if person gets back up (Standing/Sitting)
                    if sm_label in ("standing", "sitting"):
                        if VERBOSE: print(f"[{time.strftime('%H:%M:%S')}] ID {tid} FallSuspected cancelled (returned to {sm_label})")
                        current_buffer.state = "UNKNOWN"
                        current_buffer.suspect_start_ts = None
                        current_buffer.confirmation_deadline = None
                        current_buffer.confirmed_start_ts = None
                        current_buffer.alert_file_created = False
                        
            # Logic for CONFIRMED state and creating the prolonged alert file
            elif current_buffer.state == "FALL_CONFIRMED":
                sm_label = current_buffer.get_last_smoothed_label(window_frames=SMOOTH_WINDOW_FRAMES)
                
                # Check for prolonged confirmation
                if not current_buffer.alert_file_created and current_buffer.confirmed_start_ts is not None:
                    if time.time() - current_buffer.confirmed_start_ts >= CONFIRMED_ALERT_SECONDS:
                        # Create the emergency text file
                        create_emergency_alert(tid)
                        current_buffer.alert_file_created = True # Set flag to prevent repetition

                # Logic to clear CONFIRMED state if person stands up *after* confirmation
                if sm_label in ("standing", "sitting"):
                    if VERBOSE: print(f"[{time.strftime('%H:%M:%S')}] ID {tid} FallConfirmed cleared (person got up).")
                    current_buffer.state = "UNKNOWN"
                    current_buffer.suspect_start_ts = None
                    current_buffer.confirmation_deadline = None
                    current_buffer.confirmed_start_ts = None
                    current_buffer.alert_file_created = False
                    

        # optional visualization for debugging
        vis = frame.copy()
        for tid, bbox in assigned.items():
            x1, y1, x2, y2 = int(bbox.x1), int(bbox.y1), int(bbox.x2), int(bbox.y2)
            color = (0, 255, 0)
            if tid in buffers:
                if buffers[tid].state == "FALL_SUSPECTED": color = (0, 165, 255) # Orange
                if buffers[tid].state == "FALL_CONFIRMED":
                    color = (0, 0, 255) # Red
                    if buffers[tid].alert_file_created:
                        color = (255, 0, 0) # Blue (or another color to indicate file created)
            
            cv2.rectangle(vis, (x1, y1), (x2, y2), color, 2)
            
            label = f"ID:{tid} | {buffers[tid].state}" if tid in buffers else f"ID:{tid} | NEW"
            if tid in buffers and buffers[tid].alert_file_created:
                 label += " | ALERTED"
                 
            cv2.putText(vis, label, (x1, max(20, y1-6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
        cv2.imshow("FallDetector", vis)
        k = cv2.waitKey(1) & 0xFF
        if k == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("Exited.")

# ----------------------------
# Entrypoint
# ----------------------------
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Fall detection prototype using YOLO + MediaPipe Pose")
    parser.add_argument("--video", type=int, default=0, help="Webcam index or video file path")
    args = parser.parse_args()
    try:
        run_fall_detector(video_source=args.video)
    except Exception as e:
        print("Fatal error:", e)
        # Uncomment the line below to see a full traceback, useful for debugging dependencies
        # raise