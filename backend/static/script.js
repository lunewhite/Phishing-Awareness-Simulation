/* ======================================================
   PHISHING AWARENESS SIMULATOR - FRONTEND CONTROLLER
   ====================================================== */

/* ---------- INBOX ---------- */

const isSummaryPage = document.getElementById("final-score") !== null;

async function openEmail() {
    // Do NOT restart campaign if summary exists
    if (localStorage.getItem("trainingSummary")) {
        window.location.href = "/summary";
        return;
    }

    // Start campaign ONLY if not already started
    if (!localStorage.getItem("currentEpisode")) {
        const res = await fetch("/api/start/bank_alert");
        const data = await res.json();
        localStorage.setItem("currentEpisode", data.episode_id);
        localStorage.setItem("lastEmailEpisode", data.episode_id);
    }

    window.location.href = "/email";
}



/* ---------- EMAIL VIEW ---------- */

async function loadEmail() {
    const episodeId = 
    localStorage.getItem("lastEmailEpisode") ||
    localStorage.getItem("currentEpisode");
    if (!episodeId) return;

    const res = await fetch(`/api/episode/${episodeId}`);
    const data = await res.json();

    document.getElementById("sender").innerText =
        "From: " + (data.episode.sender || "Unknown");

    document.getElementById("subject").innerText =
        data.episode.subject || "";

    document.getElementById("body").innerText =
        data.episode.body || "";
    document.getElementById("from-line").innerText =
        data.episode.sender || "";
}


// User clicks phishing link inside email
async function openLink(event) {
    event.preventDefault();

    const episodeId = localStorage.getItem("currentEpisode");
    if (!episodeId) {
        alert("Session expired. Please restart the training.");
        window.location.href = "/";
        return;
    }

    // Store last email
    localStorage.setItem("lastEmailEpisode", episodeId);

    const result = await submitAction("click");
    if (!result) return;

    if (result.status === "completed") {
        handleCompletion(result);
        return;
    }

    if (result.next_episode) {
        localStorage.setItem("currentEpisode", result.next_episode);
        window.location.href = "/simulation";
    }
}




// User reports phishing
async function reportPhishing() {
    const result = await submitAction("report");

    // If backend ends campaign → summary
    if (result && result.status === "completed") {
        handleCompletion(result);
        return;
    }
}



// User closes email / goes back → ignore email
async function ignoreEmail() {
    const result = await submitAction("ignore");

    // If training ended → summary
    if (result && result.status === "completed") {
        handleCompletion(result);
        return;
    }

    // Otherwise, fallback
    window.location.href = "/summary";
}



/* ---------- PHISHING SITE SIMULATION ---------- */

async function submitCredentials() {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const errorMsg = document.getElementById("login-error");

    // Client-side validation
    
    if (!usernameInput || !passwordInput || !errorMsg) {
        console.error("Login form elements not found");
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        errorMsg.style.display = "block";
        return;
    }

    // Hide error if validation passes
    errorMsg.style.display = "none";
    const result = await submitAction("submit");
    
     if (result && result.next_episode) {
        localStorage.setItem("currentEpisode", result.next_episode);
    }
    // Show compromise warning modal
    const modal = document.getElementById("compromise-modal");
        modal.style.display = "flex";
}

function acknowledgeCompromise(){
    document.getElementById("compromise-modal").style.display = "none";
    window.location.href = "/recovery"
}

async function closePage() {
    const episodeId = localStorage.getItem("currentEpisode");

    // Only submit "close" if we are on the phishing simulation page
    if (episodeId === "bank_sim") {
        await submitAction("close");
    }

    // UI navigation only
    window.location.href = "/email-preview";
}




/* ---------- LOAD RECOVERY PAGE ---------- */

async function loadRecovery() {
    const episodeId = localStorage.getItem("currentEpisode");
    if (!episodeId) return;

    const res = await fetch(`/api/episode/${episodeId}`);
    const data = await res.json();

    document.getElementById("recovery-message").innerText =
        data.episode.body || "";

    const actionsDiv = document.getElementById("actions");
    actionsDiv.innerHTML = "";

    data.actions.forEach(a => {
        const btn = document.createElement("button");
        btn.innerText = a.label;

        btn.onclick = async () => {
            const result = await submitAction(a.action_type);

         // If training completed after recovery → go to summary
         if (result && result.status === "completed") {
              handleCompletion(result);
             return;
         }

         // Fallback safety
         window.location.href = "/summary";
     };


        actionsDiv.appendChild(btn);
    });
}



/* ---------- CORE ACTION HANDLER ---------- */

async function submitAction(actionType) {
    const episodeId = localStorage.getItem("currentEpisode");

    console.log("DEBUG submitAction ->", {
        episodeId,
        actionType
    });
    
    // Safety check
    if (!episodeId && !isSummaryPage) {
        alert("Session expired. Please restart the training.");
        window.location.href = "/";
        return;
    }

    const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            episode_id: episodeId,
            action_type: actionType
        })
    });

    console.log("DEBUG response status:", res.status);

    const data = await res.json();

    // backend rejected request
    if (!res.ok) {
        alert("Action failed. Restarting training.");
        localStorage.clear();
        window.location.href = "/";
        return;
    }

    // Training completed
    if (data.status === "completed") {
        handleCompletion(data);
        return;
    }

    // Continue campaign
    if (data.next_episode) {
        localStorage.setItem("currentEpisode", data.next_episode);
    }
    return data;
}

/* ---------- LOAD SUMMARY PAGE ---------- */
function loadSummary() {
    const summaryRaw = localStorage.getItem("trainingSummary");

    // Safety: no summary data
    if (!summaryRaw) {
        window.location.href = "/";
        return;
    }

    const summary = JSON.parse(summaryRaw);

    /* ---- Score ---- */
    const scoreEl = document.getElementById("final-score");
    scoreEl.innerText = `Awareness Score: ${summary.awareness_score}`;

    /* ---- Risk Level ---- */
    const riskEl = document.getElementById("risk-level");
    riskEl.innerText = `Risk Level: ${summary.risk_level}`;
    riskEl.classList.add(summary.risk_level.toLowerCase());

    /* ---- Mistakes ---- */
    const mistakesList = document.getElementById("mistakes-list");
    mistakesList.innerHTML = "";

    if (summary.mistakes.length === 0) {
        const li = document.createElement("li");
        li.innerText = "No risky actions detected.";
        mistakesList.appendChild(li);
    } else {
        summary.mistakes.forEach(m => {
            const li = document.createElement("li");
            li.innerText = m;
            mistakesList.appendChild(li);
        });
    }

    /* ---- Strengths ---- */
    const strengthsList = document.getElementById("strengths-list");
    strengthsList.innerHTML = "";

    if (summary.strengths.length === 0) {
        const li = document.createElement("li");
        li.innerText = "No positive actions recorded.";
        strengthsList.appendChild(li);
    } else {
        summary.strengths.forEach(s => {
            const li = document.createElement("li");
            li.innerText = s;
            strengthsList.appendChild(li);
        });
    }
}

function handleCompletion(summary) {
    localStorage.setItem("trainingSummary", JSON.stringify(summary));
    window.location.href = "/summary";
}

function restartTraining() {
    localStorage.clear();
    window.location.href = "/";
}



/* ---------- AUTO LOAD (PAGE DETECTION) ---------- */

document.addEventListener("DOMContentLoaded", () => {
    // Recovery page
    if (document.getElementById("recovery-message")) {
        loadRecovery();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("sender")) {
        loadEmail();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("final-score")) {
        loadSummary();
    }
});

