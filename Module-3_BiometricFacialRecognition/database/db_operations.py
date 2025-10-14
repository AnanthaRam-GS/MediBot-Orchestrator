"""
Database Operations for Facial Recognition (Universal Robot DB)
---------------------------------------------------------------
Connects to the central MariaDB server running on Raspberry Pi.
Stores and retrieves embeddings in the shared `facial_recognition_users` table
of the `robot_db` database.

Fields in table:
- patient_id (INT, AUTO_INCREMENT)
- name (VARCHAR)
- embedding (BLOB)
- image_path (optional, VARCHAR)
- created_at (DATETIME)
"""

import mysql.connector
from mysql.connector import Error
import numpy as np
import pickle
from datetime import datetime
from utils.similarity import cosine_similarity


class FaceDB:
    def __init__(self,
                 host="10.147.145.165",          # Raspberry Pi IP
                 user="robot_user",
                 password="robot_pass",
                 database="robot_db",
                 table_name="facial_recognition_users"):
        """Connect to the universal robot database and target table."""
        try:
            self.conn = mysql.connector.connect(
                host=host,
                user=user,
                password=password,
                database=database,
                port=3306
            )
            self.cursor = self.conn.cursor()
            self.table_name = table_name
            print(f"[MySQL] Connected to '{database}' at {host} successfully.")
        except Error as e:
            print(f"[ERROR] Could not connect to MySQL: {e}")
            raise

    # -------------------------------------------------------------
    # DATA INSERTION / RETRIEVAL
    # -------------------------------------------------------------
    def insert_user(self, name, embedding, image_path=None):
        """Insert a new user's embedding into the shared table."""
        try:
            serialized_emb = pickle.dumps(embedding)
            query = f"""
                INSERT INTO {self.table_name} (name, embedding, created_at)
                VALUES (%s, %s, %s)
            """
            self.cursor.execute(query, (name, serialized_emb, datetime.now()))
            self.conn.commit()
            new_id = self.cursor.lastrowid
            print(f"[MySQL] Patient '{name}' added successfully with ID: {new_id}")
            return new_id
        except Error as e:
            print(f"[ERROR] Failed to insert user: {e}")
            return None

    def fetch_all_embeddings(self):
        """Fetch all user embeddings from the shared table."""
        try:
            query = f"SELECT patient_id, name, embedding FROM {self.table_name}"
            self.cursor.execute(query)
            records = self.cursor.fetchall()
            users = []
            for pid, name, emb_blob in records:
                try:
                    embedding = pickle.loads(emb_blob)
                    users.append({"patient_id": pid, "name": name, "embedding": embedding})
                except Exception:
                    print(f"[WARNING] Failed to decode embedding for {name} (ID: {pid})")
            return users
        except Error as e:
            print(f"[ERROR] Failed to fetch embeddings: {e}")
            return []

    def match_face(self, query_embedding, threshold=0.7):
        """Find the best match from database using cosine similarity."""
        users = self.fetch_all_embeddings()
        if not users:
            print("[INFO] No users in database yet.")
            return "Database Empty"

        best_match = None
        best_score = -1

        for user in users:
            stored_emb = user["embedding"]
            score = cosine_similarity(query_embedding, stored_emb)
            if score > best_score:
                best_match = user
                best_score = score

        if best_score >= threshold:
            pid = best_match["patient_id"]
            name = best_match["name"]
            print(f"[MATCH] {name} (ID: {pid}) | Similarity: {best_score:.3f}")
            return f"{name} (ID: {pid})"
        else:
            print(f"[NO MATCH] Best similarity: {best_score:.3f}")
            return "Unknown"

    def close(self):
        """Close MySQL connection cleanly."""
        if self.conn.is_connected():
            self.cursor.close()
            self.conn.close()
            print("[MySQL] Connection closed.")


# Standalone quick test
if __name__ == "__main__":
    db = FaceDB()
    dummy_emb = np.random.rand(512)
    db.insert_user("John Doe", dummy_emb)
    print("Patients in DB:", len(db.fetch_all_embeddings()))
    db.close()
