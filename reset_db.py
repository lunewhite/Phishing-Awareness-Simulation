import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "phishing.db"

if DB_PATH.exists():
    DB_PATH.unlink()
    print("Existing database deleted")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

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

cursor.execute("""
INSERT INTO campaigns VALUES
('bank_alert',
 'Bank Account Verification Alert',
 'Finance',
 'Medium',
 'phishing',
 'bank_ep_1')
""")

# Define the episodes for the bank alert campaign
episodes = [
    ('bank_ep_1', 'bank_alert', 'email', 'SBI Support Desk <noreply@sbi-alerts.net>',
     'Notice: Account Access Temporarily Locked',
     'Hello,\n\nAs part of routine protection checks, we have temporarily restricted your State Bank of India Internet Banking access.\n\nTo restore normal access, complete the pending security confirmation from the secure message panel below.\n\nThis verification is available for a limited period.\n\nState Bank of India\nSecurity Team',
     'urgency,fear'),

    ('bank_ep_2', 'bank_alert', 'email', 'SBI Security Team <alerts@sbi-alerts.net>',
     'Reminder: Security Confirmation Still Pending',
     'Your access remains limited until the required security confirmation is completed.',
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

# Insert all episodes into the database
cursor.executemany("""
INSERT INTO episodes VALUES (?, ?, ?, ?, ?, ?, ?)
""", episodes)

# Define the available actions for each episode
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
    ('bank_sim', 'report_after_cancel', 'Report phishing'),
    ('bank_sim', 'ignore_after_cancel', 'Ignore and close'),

    ('bank_recovery', 'password', 'Change password'),
    ('bank_recovery', 'support', 'Contact support')
]

# Insert all actions into the database
cursor.executemany("""
INSERT INTO episode_actions (episode_id, action_type, label)
VALUES (?, ?, ?)
""", actions)

# Define the outcomes for each action in each episode
outcomes = [
    ('bank_ep_1', 'hover', 'bank_ep_1', 0, 0),
    ('bank_ep_1', 'click', 'bank_sim', 0, -10),
    ('bank_ep_1', 'ignore', 'bank_ep_2', 0, 0),
    ('bank_ep_1', 'report', None, 1, +50),

    ('bank_ep_2', 'click', 'bank_sim', 0, -10),
    ('bank_ep_2', 'ignore', None, 1, +50),
    ('bank_ep_2', 'report', None, 1, +15),

    ('bank_sim', 'submit', 'bank_recovery', 0, -30),
    ('bank_sim', 'close', None, 0, 0),
    ('bank_sim', 'report_after_cancel', None, 1, +10),
    ('bank_sim', 'ignore_after_cancel', None, 1, 0),

    ('bank_recovery', 'password', None, 1, -10),
    ('bank_recovery', 'support', None, 1, +5)
]

# Insert all outcomes into the database
cursor.executemany("""
INSERT INTO episode_outcomes
(episode_id, action_type, next_episode_id, ends_campaign, score_delta)
VALUES (?, ?, ?, ?, ?)
""", outcomes)

# Commit all changes and close the database connection
conn.commit()
conn.close()

print("Fresh database created successfully")
