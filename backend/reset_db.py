import os
import sqlite3
from pathlib import Path

# ---------------------------------
# Resolve database path
# ---------------------------------
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "phishing.db"

# ---------------------------------
# Delete existing database if exists
# ---------------------------------
if DB_PATH.exists():
    DB_PATH.unlink()
    print("🗑️ Existing database deleted")

# ---------------------------------
# Create new database connection
# ---------------------------------
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# ---------------------------------
# Create tables
# ---------------------------------

cursor.executescript("""
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL
);

CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    verdict TEXT NOT NULL,
    start_episode_id TEXT NOT NULL
);

CREATE TABLE episodes (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    type TEXT NOT NULL,
    sender TEXT,
    subject TEXT,
    body TEXT,
    psychology_tags TEXT,
    FOREIGN KEY (campaign_id) REFERENCES campaigns (id)
);

CREATE TABLE episode_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    label TEXT NOT NULL,
    FOREIGN KEY (episode_id) REFERENCES episodes (id)
);

CREATE TABLE episode_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    next_episode_id TEXT,
    ends_campaign INTEGER DEFAULT 0,
    score_delta INTEGER DEFAULT 0,
    FOREIGN KEY (episode_id) REFERENCES episodes (id)
);

CREATE TABLE action_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    campaign_id TEXT,
    episode_id TEXT,
    action_type TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
""")

# ---------------------------------
# Insert seed campaign
# ---------------------------------

cursor.execute("""
INSERT INTO campaigns VALUES
('bank_alert',
 'Bank Account Verification Alert',
 'Finance',
 'Medium',
 'phishing',
 'bank_ep_1')
""")

episodes = [
    ('bank_ep_1', 'bank_alert', 'email', 'Your Bank',
     'Urgent: Verify Your Account',
     'We detected unusual activity on your account. Immediate action required.',
     'urgency,fear'),

    ('bank_ep_2', 'bank_alert', 'email', 'Your Bank',
     'Final Reminder',
     'Failure to verify may result in limited access.',
     'urgency,fear'),

    ('bank_sim', 'bank_alert', 'simulation', 'Secure Bank Portal',
     'Account Verification',
     'Enter your credentials to continue.',
     'authority,urgency'),

    ('bank_recovery', 'bank_alert', 'info', 'Bank Security Team',
     'Security Advisory',
     'If you entered credentials, secure your account immediately.',
     'education')
]

cursor.executemany("""
INSERT INTO episodes VALUES (?, ?, ?, ?, ?, ?, ?)
""", episodes)

actions = [
    ('bank_ep_1', 'hover', 'Hover over link'),
    ('bank_ep_1', 'click', 'Click verification link'),
    ('bank_ep_1', 'ignore', 'Ignore email'),
    ('bank_ep_1', 'report', 'Report phishing'),

    ('bank_ep_2', 'click', 'Click verification link'),
    ('bank_ep_2', 'ignore', 'Ignore reminder'),
    ('bank_ep_2', 'report', 'Report phishing'),

    ('bank_sim', 'submit', 'Submit credentials'),
    ('bank_sim', 'close', 'Close page'),
    ('bank_sim', 'report', 'Report phishing'),

    ('bank_recovery', 'password', 'Change password'),
    ('bank_recovery', 'support', 'Contact support')
]

cursor.executemany("""
INSERT INTO episode_actions (episode_id, action_type, label)
VALUES (?, ?, ?)
""", actions)

outcomes = [
    ('bank_ep_1', 'hover', 'bank_ep_1', 0, 0),
    ('bank_ep_1', 'click', 'bank_sim', 0, -10),
    ('bank_ep_1', 'ignore', 'bank_ep_2', 0, 0),
    ('bank_ep_1', 'report', None, 1, +50),

    ('bank_ep_2', 'click', 'bank_sim', 0, -10),
    ('bank_ep_2', 'ignore', None, 1, 0),
    ('bank_ep_2', 'report', None, 1, +15),

    ('bank_sim', 'submit', 'bank_recovery', 0, -30),
    ('bank_sim', 'close', 'bank_recovery', 0, -10),
    ('bank_sim', 'report', None, 1, +10),

    ('bank_recovery', 'password', None, 1, -10),
    ('bank_recovery', 'support', None, 1, +5)
]

cursor.executemany("""
INSERT INTO episode_outcomes
(episode_id, action_type, next_episode_id, ends_campaign, score_delta)
VALUES (?, ?, ?, ?, ?)
""", outcomes)

conn.commit()
conn.close()

print("✅ Fresh database created successfully")
