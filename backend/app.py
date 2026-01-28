from flask import Flask, jsonify, request, session, render_template
import sqlite3
from pathlib import Path

app = Flask(__name__)
app.secret_key = "phishing-awareness-secret-key"

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "phishing.db"

# rendering templates
@app.route("/")
def inbox_page():
    return render_template("inbox.html")

@app.route("/email")
def email_page():
    return render_template("email.html")

@app.route("/simulation")
def simulation_page():
    return render_template("simulation.html")

@app.route("/email-preview")
def email_preview_page():
    return render_template("email.html")

@app.route("/recovery")
def recovery_page():
    return render_template("recovery.html")

@app.route("/summary")
def summary_page():
    return render_template("summary.html")


# ---------------------------
# Utility: DB connection
# ---------------------------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ---------------------------
# API 1: Simulated Inbox
# ---------------------------
@app.route("/api/inbox")
def inbox():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, title, category, difficulty
        FROM campaigns
    """)

    campaigns = [dict(row) for row in cur.fetchall()]
    conn.close()

    return jsonify(campaigns)


# ---------------------------
# API 2: Start Campaign
# ---------------------------
@app.route("/api/start/<campaign_id>")
def start_campaign(campaign_id):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT start_episode_id
        FROM campaigns
        WHERE id = ?
    """, (campaign_id,))

    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Campaign not found"}), 404
    
    session.clear()  # ensures no leftover data from previous runs

    session["campaign_id"] = campaign_id
    session["episode_id"] = row["start_episode_id"]
    session["score"] = 50            # neutral baseline
    session["recovery"] = False      # not in recovery mode yet
    session["mistakes"] = []         # track risky actions
    session["strengths"] = []        # track good behavior
    session["clicked_link"] = False 

    # 4. Respond with starting context
    return jsonify({
        "status": "started",
        "campaign_id": campaign_id,
        "episode_id": row["start_episode_id"],
        "awareness_score": session["score"]
    })

    

# ---------------------------
# API 3: Get Episode
# ---------------------------
@app.route("/api/episode/<episode_id>")
def get_episode(episode_id):
    conn = get_db()
    cur = conn.cursor()

    # Fetch episode
    cur.execute("""
        SELECT * FROM episodes
        WHERE id = ?
    """, (episode_id,))
    episode = cur.fetchone()

    if not episode:
        conn.close()
        return jsonify({"error": "Episode not found"}), 404

    # Fetch actions
    cur.execute("""
        SELECT action_type, label
        FROM episode_actions
        WHERE episode_id = ?
    """, (episode_id,))
    actions = [dict(row) for row in cur.fetchall()]

    conn.close()

    return jsonify({
        "episode": dict(episode),
        "actions": actions
    })


# ---------------------------
# API 4: Submit Action
# ---------------------------


@app.route("/api/action", methods=["POST"])
def submit_action():
    data = request.json

    episode_id = data.get("episode_id")
    action_type = data.get("action_type")

    # 1. Validate session
    if "campaign_id" not in session:
        return jsonify({"error": "No active campaign"}), 400

    # 2. Log action to database
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO action_logs (campaign_id, episode_id, action_type)
        VALUES (?, ?, ?)
    """, (session["campaign_id"], 
          episode_id, 
          action_type))
    
    # 4. Detect mistake => enter recovery mode
    if action_type in ["click", "submit"]:
        session["recovery"] = True
        session["mistakes"].append(action_type)

    # 5. Detect good recovery behavior
    if action_type in ["report", "password", "support"]:
        session["strengths"].append(action_type)    
    
    if action_type in ["password", "support"]:
        session["score"] = min(session["score"], 45)

    if action_type == "click":
        session["clicked_link"] = True
        session["mistakes"].append(
            "Clicked a phishing link and visited a fake login page"
        )

    if action_type == "close" and session.get("clicked_link"):
        session["strengths"].append(
            "Recognized suspicious login page and exited without entering credentials"
        )

    # 6. Determine next episode
    cur.execute("""
        SELECT next_episode_id, ends_campaign, score_delta
        FROM episode_outcomes
        WHERE episode_id = ? AND action_type = ?
    """, (episode_id, action_type))

    outcome = cur.fetchone()
    conn.commit()
    conn.close()

    if not outcome:
        return jsonify({"error": "Invalid action"}), 400

    # 7. Campaign completion logic
    if outcome["ends_campaign"] and action_type != "submit":
        score = session["score"] + outcome["score_delta"]

        if score >= 70:
            risk = "Low"
        elif score >= 60:
            risk = "Medium"
        else:
            risk = "High"

        summary = {
            "status": "completed",
            "awareness_score": score,
            "risk_level": risk,
            "mistakes": session["mistakes"],
            "strengths": session["strengths"]
        } 

        session.clear() # end session cleanly
        return jsonify(summary)    

    # 8. Continue campaign
    session["episode_id"] = outcome["next_episode_id"]

    return jsonify({
        "status": "continue",
        "next_episode": outcome["next_episode_id"],
        "awareness_score": session["score"]
    })  

if __name__ == "__main__":
       app.run(debug=True)
