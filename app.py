from flask import Flask, jsonify, request, session, render_template
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
app = Flask(
    __name__,
    template_folder=str(BASE_DIR),
    static_folder=str(BASE_DIR),
    static_url_path="/static"
)
app.secret_key = "phishing-awareness-secret-key"
DB_PATH = BASE_DIR / "phishing.db"

# --------------------------- Route Handlers ---------------------------

@app.route("/")
def index_page():
    return render_template("index.html")

@app.route("/welcome")
def welcome_page():
    session.clear()
    return render_template("welcome.html")

@app.route("/api/reset-session", methods=["POST"])
def reset_session():
    session.clear()
    return jsonify({"status": "session_reset"})

@app.route("/inbox")
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

# --------------------------- Utility Functions ---------------------------

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# --------------------------- API Endpoints ---------------------------

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

    session.clear()

    session["campaign_id"] = campaign_id
    session["episode_id"] = row["start_episode_id"]
    session["score"] = 50
    session["recovery"] = False
    session["mistakes"] = []
    session["strengths"] = []
    session["clicked_link"] = False

    return jsonify({
        "status": "started",
        "campaign_id": campaign_id,
        "episode_id": row["start_episode_id"],
        "awareness_score": session["score"]
    })

    

@app.route("/api/episode/<episode_id>")
def get_episode(episode_id):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM episodes
        WHERE id = ?
    """, (episode_id,))
    episode = cur.fetchone()

    if not episode:
        conn.close()
        return jsonify({"error": "Episode not found"}), 404

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
@app.route("/api/action", methods=["POST"])
def submit_action():
    data = request.json
    episode_id = data.get("episode_id")
    action_type = data.get("action_type")

    if "campaign_id" not in session:
        return jsonify({
            "status": "restart_required",
            "error": "No active campaign"
        })

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO action_logs (campaign_id, episode_id, action_type)
        VALUES (?, ?, ?)
    """, (session["campaign_id"], episode_id, action_type))

    if action_type in ["click", "submit"]:
        session["recovery"] = True
        session["mistakes"].append(action_type)

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

    if action_type in ["report", "report_after_cancel"]:
        session["strengths"].append("reported_phishing")

    if action_type == "close":
        session["strengths"].append("exited_safely")

    cur.execute("""
        SELECT next_episode_id, ends_campaign, score_delta
        FROM episode_outcomes
        WHERE episode_id = ? AND action_type = ?
    """, (episode_id, action_type))

    outcome = cur.fetchone()
    conn.commit()
    conn.close()

    if not outcome:
        return jsonify({
            "status": "restart_required",
            "error": "Invalid action"
        })

    if outcome["ends_campaign"] and action_type != "submit":
        score_delta = outcome["score_delta"]

        if action_type == "ignore_after_cancel":
            score_delta = 5

        score = session["score"] + score_delta

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

        session.clear()
        return jsonify(summary)

    session["episode_id"] = outcome["next_episode_id"]

    return jsonify({
        "status": "continue",
        "next_episode": outcome["next_episode_id"],
        "awareness_score": session["score"]
    })

if __name__ == "__main__":
    app.run(debug=True)
