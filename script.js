//templates for other emails examples
const previewEmails = {
    google_security: {
        sender: "Google Account Team <no-reply@accounts.google.com>",
        subject: "Security alert",
        body:
            "Hi,\n\nWe noticed a new sign-in to your Google Account from Chrome on Windows earlier today.\n\nIf this was you, no action is needed.\n\nIf this wasn't you, review your recent security activity and update your password as soon as possible.\n\nGoogle Account Security",
        brand: "Google",
        team: "Account Security",
        time: "Today, 9:41 AM"
    },
    linkedin_searches: {
        sender: "LinkedIn Updates <members@linkedin.com>",
        subject: "You appeared in 5 searches",
        body:
            "Hello,\n\nYour profile showed up in 5 recruiter and peer searches this week.\n\nStay active by updating your headline, adding recent projects, and responding to new connection requests.\n\nSee who viewed your profile when you next sign in.\n\nLinkedIn Member Updates",
        brand: "LinkedIn",
        team: "Member Updates",
        time: "Today, 8:12 AM"
    },
    amazon_shipping: {
        sender: "Amazon.in <shipment-tracking@amazon.in>",
        subject: "Your order has shipped",
        body:
            "Hello,\n\nYour recent order has been shipped and is now in transit.\n\nEstimated delivery: Tomorrow by 8 PM.\n\nItems in this shipment:\n- Wireless mouse\n- USB-C adapter\n\nYou can review the latest tracking details from your Amazon orders page.\n\nAmazon Shipping",
        brand: "Amazon",
        team: "Shipping Updates",
        time: "Yesterday"
    },
    netflix_billing: {
        sender: "Netflix Billing <info@mailer.netflix.com>",
        subject: "Payment issue detected",
        body:
            "Hi,\n\nWe were unable to process your latest monthly payment for your Netflix membership.\n\nYour account remains active for now, but streaming access may pause if the payment method is not updated before the next billing retry.\n\nYou can review your billing details from your Netflix account settings.\n\nNetflix Support",
        brand: "Netflix",
        team: "Billing Support",
        time: "Yesterday"
    },
    github_dependabot: {
        sender: "GitHub <noreply@github.com>",
        subject: "Dependabot alerts",
        body:
            "Hello,\n\nDependabot found security vulnerabilities in one of your repository dependencies.\n\nRepository: cyber-lab-demo\nSeverity: Moderate\nPackage: example-package\n\nReview the alert details in the Security tab to inspect the affected version and available patch.\n\nGitHub Security",
        brand: "GitHub",
        team: "Security Alerts",
        time: "2 days ago"
    },
    university_schedule: {
        sender: "University Admin Office <admin@campus.edu>",
        subject: "Exam schedule update",
        body:
            "Dear Student,\n\nThe revised examination timetable for the end-semester assessments has now been published.\n\nPlease review your department portal for room assignments, start times, and the updated invigilation rules before exam week begins.\n\nRegards,\nOffice of Academic Administration",
        brand: "University",
        team: "Admin Office",
        time: "2 days ago"
    },
    microsoft_summary: {
        sender: "Microsoft 365 <noreply@acct.microsoft.com>",
        subject: "Your weekly activity summary",
        body:
            "Hello,\n\nHere is your Microsoft account activity summary for the past week.\n\nHighlights:\n- 3 documents edited in OneDrive\n- 2 sign-ins from your usual device\n- No password changes detected\n\nYou can review your full activity history from your Microsoft account dashboard.\n\nMicrosoft Account Team",
        brand: "Microsoft",
        team: "Account Activity",
        time: "3 days ago"
    },
    twitter_login: {
        sender: "X Security <verify@x.com>",
        subject: "New login from Chrome",
        body:
            "Hi,\n\nWe noticed a new login to your account from Chrome on a Windows device.\n\nLocation estimate: Kolkata, India\nTime: 11:04 PM\n\nIf this was you, you can safely ignore this message. If not, review your active sessions and change your password immediately.\n\nX Security",
        brand: "X",
        team: "Security Notifications",
        time: "3 days ago"
    },
    coursera_progress: {
        sender: "Coursera <no-reply@coursera.org>",
        subject: "Course progress reminder",
        body:
            "Hello,\n\nYou're halfway through your cybersecurity course and still on track to finish this month.\n\nNext up:\n- Phishing email analysis\n- Incident response basics\n- Final quiz\n\nA short study session this week will help you stay on schedule.\n\nCoursera Learning Team",
        brand: "Coursera",
        team: "Learning Team",
        time: "4 days ago"
    }
};

const TRAINING_STATE_KEYS = [
    "trainingSummary",
    "currentEpisode",
    "lastEmailEpisode",
    "activeEmailEpisode",
    "ep2Unlocked",
    "previewEmailId"
];

//to check if we are on summary page
const isSummaryPage = document.getElementById("final-score") !== null;

function resetTrainingState() {
    TRAINING_STATE_KEYS.forEach(key => localStorage.removeItem(key));
}

async function clearSessionOnWelcome() {
    if (window.location.pathname === "/welcome") {
        resetTrainingState();
        try {
            await fetch("/api/reset-session", { method: "POST" });
        } catch (err) {
            console.warn("Unable to reset server session:", err);
        }
    }
}

window.addEventListener("DOMContentLoaded", () => {
    clearSessionOnWelcome();
});


//INBOX FUNCTIONS

async function openEmail(targetEpisodeId = null) {
    localStorage.removeItem("previewEmailId");

    //if previous sim ended retart whole thing
    if (localStorage.getItem("trainingSummary")) {
        localStorage.removeItem("trainingSummary");
        localStorage.removeItem("currentEpisode");
        localStorage.removeItem("lastEmailEpisode");
        localStorage.removeItem("activeEmailEpisode");
        localStorage.removeItem("ep2Unlocked");
    }

    //start campaigning if not started
    if (!localStorage.getItem("currentEpisode")) {
        const res = await fetch("/api/start/bank_alert");
        const data = await res.json();
        localStorage.setItem("currentEpisode", data.episode_id);
        localStorage.setItem("lastEmailEpisode", data.episode_id);
        localStorage.removeItem("ep2Unlocked");
    }

    if (targetEpisodeId) {
        localStorage.setItem("lastEmailEpisode", targetEpisodeId);
    }

    window.location.href = "/email";
}

function openPreviewEmail(previewEmailId) {
    localStorage.setItem("previewEmailId", previewEmailId);
    window.location.href = "/email";
}

function loadInboxState() {
    const rowEp1 = document.getElementById("row-ep1");
    const rowEp2 = document.getElementById("row-ep2");
    if (!rowEp1 || !rowEp2) return;

    const currentEpisode = localStorage.getItem("currentEpisode");
    const lastEmailEpisode = localStorage.getItem("lastEmailEpisode");
    const unlocked = localStorage.getItem("ep2Unlocked") === "true";
    const showEpisodeTwo =
        unlocked &&
        (currentEpisode === "bank_ep_2" || lastEmailEpisode === "bank_ep_2");

    if (showEpisodeTwo) {
        rowEp2.style.display = "flex";
        rowEp1.classList.remove("unread-modern", "active-modern");
        rowEp1.classList.add("read-modern", "disabled-modern");
    } else {
        rowEp2.style.display = "none";
        rowEp1.classList.remove("read-modern", "disabled-modern");
        rowEp1.classList.add("unread-modern", "active-modern");
    }
}

//EMAIL VIEW FUNCTIONS

async function loadEmail() {
    const previewEmailId = localStorage.getItem("previewEmailId");
    if (previewEmailId && previewEmails[previewEmailId]) {
        const preview = previewEmails[previewEmailId];
        renderEmail(preview, { readOnly: true });
        return;
    }

    let episodeId = 
        localStorage.getItem("lastEmailEpisode") ||
        localStorage.getItem("currentEpisode");

    if (!episodeId) {
        const res = await fetch("/api/start/bank_alert");
        const data = await res.json();
        episodeId = data.episode_id;
        localStorage.setItem("currentEpisode", episodeId);
        localStorage.setItem("lastEmailEpisode", episodeId);
        localStorage.removeItem("ep2Unlocked");
    }

    localStorage.setItem("activeEmailEpisode", episodeId);

    const res = await fetch(`/api/episode/${episodeId}`);
    const data = await res.json();

    renderEmail(
        {
            sender: data.episode.sender || "Unknown",
            subject: data.episode.subject || "",
            body: data.episode.body || "",
            brand: "State Bank of India",
            team: "Support-Desk",
            time: "Today"
        },
        { readOnly: false }
    );
}

function renderEmail(email, options = {}) {
    const { readOnly = false } = options;
    const senderEl = document.getElementById("sender");
    const subjectEl = document.getElementById("subject");
    const bodyEl = document.getElementById("body");
    const fromLineEl = document.getElementById("from-line");
    const brandEl = document.getElementById("banner-brand");
    const teamEl = document.getElementById("banner-team");
    const timeEl = document.getElementById("email-time");
    const modeNoteEl = document.getElementById("email-mode-note");
    const linkSectionEl = document.getElementById("email-link-section");
    const actionsEl = document.getElementById("email-actions");
    const ctaEl = document.getElementById("email-cta");

    senderEl.innerText = email.sender || "Unknown";
    subjectEl.innerText = email.subject || "";
    bodyEl.innerText = email.body || "";
    fromLineEl.innerText = email.sender || "";
    brandEl.innerText = email.brand || "Inbox";
    teamEl.innerText = email.team || "";
    timeEl.innerText = email.time || "Today";

    if (readOnly) {
        modeNoteEl.hidden = false;
        modeNoteEl.innerText = "Read-only preview: this message is for viewing only.";
        linkSectionEl.style.display = "none";
        actionsEl.style.display = "flex";
        ctaEl.innerText = "";
    } else {
        modeNoteEl.hidden = true;
        modeNoteEl.innerText = "";
        linkSectionEl.style.display = "block";
        actionsEl.style.display = "flex";
        ctaEl.innerText = "Change your credential here";
    }
}


//when phishing link is clicked
async function openLink(event) {
    event.preventDefault();

    if (localStorage.getItem("previewEmailId")) {
        return;
    }

    const episodeId = localStorage.getItem("currentEpisode");
    if (!episodeId) {
        alert("Session expired. Please restart the training.");
        window.location.href = "/";
        return;
    }

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




//user reports phishing email
async function reportPhishing() {
    if (localStorage.getItem("previewEmailId")) {
        const summary = {
            status: "completed",
            awareness_score: 0,
            risk_level: "High",
            mistakes: ["false_report"],
            strengths: []
        };
        localStorage.setItem("trainingSummary", JSON.stringify(summary));
        localStorage.removeItem("previewEmailId");
        window.location.href = "/summary";
        return;
    }

    const emailEpisodeId =
        localStorage.getItem("activeEmailEpisode") ||
        localStorage.getItem("lastEmailEpisode") ||
        localStorage.getItem("currentEpisode");

    const result = await submitAction("report", emailEpisodeId);
    if (!result) return;

    if (result.next_episode) {
        localStorage.setItem("currentEpisode", result.next_episode);
        window.location.href = "/email";
    }
}



//user closes or ignores emails
async function ignoreEmail() {
    if (localStorage.getItem("previewEmailId")) {
        localStorage.removeItem("previewEmailId");
        window.location.href = "/inbox";
        return;
    }

    const emailEpisodeId =
        localStorage.getItem("activeEmailEpisode") ||
        localStorage.getItem("lastEmailEpisode") ||
        localStorage.getItem("currentEpisode");

    const result = await submitAction("ignore", emailEpisodeId);
    if (!result) return;

    if (result.status === "completed") {
        handleCompletion(result);
        return;
    }

    if (result.next_episode) {
        if (emailEpisodeId === "bank_ep_1" && result.next_episode === "bank_ep_2") {
            localStorage.setItem("ep2Unlocked", "true");
        }
        localStorage.setItem("currentEpisode", result.next_episode);
        localStorage.setItem("lastEmailEpisode", result.next_episode);
        window.location.href = "/inbox";
        return;
    }

    window.location.href = "/inbox";
}



//phishing site simulation

async function submitCredentials() {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const errorMsg = document.getElementById("login-error");

    //client-side validation
    
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

    //hide error if validation passes
    errorMsg.style.display = "none";
    const result = await submitAction("submit");
    
     if (result && result.next_episode) {
        localStorage.setItem("currentEpisode", result.next_episode);
    }
    //show compromise modal if user submit credential
    const modal = document.getElementById("compromise-modal");
    const cancelModal = document.getElementById("cancel-decision-modal");
    if (cancelModal) cancelModal.style.display = "none";
    if (modal) modal.style.display = "flex";
}

function acknowledgeCompromise(){
    document.getElementById("compromise-modal").style.display = "none";
    window.location.href = "/recovery"
}

async function closePage() {
    const result = await submitAction("close");
    if (!result) return;
    const cancelModal = document.getElementById("cancel-decision-modal");
    if (cancelModal) cancelModal.style.display = "flex";
}

//Cancel Decision Modal 
async function reportAfterCancel() {
    const result = await submitAction("report_after_cancel");
    if (result && result.status === "completed") {
        handleCompletion(result);
    }
}

async function ignoreAfterCancel() {
    const result = await submitAction("ignore_after_cancel");
    if (result && result.status === "completed") {
        handleCompletion(result);
    }
}




//LOAD RECOVERY PAGE 

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

         //go to summary
         if (result && result.status === "completed") {
              handleCompletion(result);
             return;
         }

         //safety check
         window.location.href = "/summary";
     };


        actionsDiv.appendChild(btn);
    });
}



//CORE ACTION HANDLER

async function submitAction(actionType, episodeIdOverride = null) {
    const episodeId = episodeIdOverride || localStorage.getItem("currentEpisode");

    console.log("DEBUG submitAction ->", {
        episodeId,
        actionType
    });
    
    // safety check
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

    if (data && data.status === "restart_required") {
        alert("Session expired. Restarting training.");
        localStorage.clear();
        window.location.href = "/";
        return;
    }

    // backend rejected request
    if (!res.ok) {
        alert("Action failed. Restarting training.");
        localStorage.clear();
        window.location.href = "/";
        return;
    }

    //simulation completed
    if (data.status === "completed") {
        handleCompletion(data);
        return;
    }

    // continue
    if (data.next_episode) {
        localStorage.setItem("currentEpisode", data.next_episode);
    }
    return data;
}

//LOAD SUMMARY PAGE 
function loadSummary() {
    const summaryRaw = localStorage.getItem("trainingSummary");

    // safety check
    if (!summaryRaw) {
        window.location.href = "/";
        return;
    }

    const summary = JSON.parse(summaryRaw);
    const actionLabels = {
        click: "Clicked a phishing link.",
        submit: "Entered credentials on the phishing page.",
        ignore: "Ignored a suspicious email without reporting it.",
        reported_phishing: "Reported the phishing attempt.",
        exited_safely: "Exited the suspicious page without submitting credentials.",
        password: "Changed account password after the incident.",
        support: "Contacted bank support to secure the account.",
        report: "Reported the suspicious email.",
        report_after_cancel: "Reported phishing after canceling the page.",
        ignore_after_cancel: "Closed the cancel/report prompt without reporting.",
        false_report: "Reported a safe email as phishing."
    };

    function toReadableAction(value) {
        if (!value) return "Unknown action.";
        return actionLabels[value] || value;
    }

    const scoreEl = document.getElementById("final-score");
    scoreEl.innerText = `Awareness Score: ${summary.awareness_score}`;

    const riskEl = document.getElementById("risk-level");
    riskEl.innerText = `Risk Level: ${summary.risk_level}`;
    riskEl.classList.add(summary.risk_level.toLowerCase());

    const riskExplainerEl = document.getElementById("risk-explainer");
    if (riskExplainerEl) {
        if (summary.risk_level === "Low") {
            riskExplainerEl.innerText =
                "Strong awareness: your choices show good phishing resistance.";
        } else if (summary.risk_level === "Medium") {
            riskExplainerEl.innerText =
                "Moderate awareness: some actions were safe, but there are gaps to improve.";
        } else {
            riskExplainerEl.innerText =
                "High risk: this run shows vulnerable behavior and needs immediate improvement.";
        }
    }

    const mistakesList = document.getElementById("mistakes-list");
    mistakesList.innerHTML = "";

    if (summary.mistakes.length === 0) {
        const li = document.createElement("li");
        li.innerText = "No risky actions detected.";
        mistakesList.appendChild(li);
    } else {
        const seenMistakes = new Set();
        summary.mistakes.forEach(m => {
            const readable = toReadableAction(m);
            if (seenMistakes.has(readable)) return;
            seenMistakes.add(readable);
            const li = document.createElement("li");
            li.innerText = readable;
            mistakesList.appendChild(li);
        });
    }

    const strengthsList = document.getElementById("strengths-list");
    strengthsList.innerHTML = "";

    if (summary.strengths.length === 0) {
        const li = document.createElement("li");
        li.innerText = "No positive actions recorded.";
        strengthsList.appendChild(li);
    } else {
        const seenStrengths = new Set();
        summary.strengths.forEach(s => {
            const readable = toReadableAction(s);
            if (seenStrengths.has(readable)) return;
            seenStrengths.add(readable);
            const li = document.createElement("li");
            li.innerText = readable;
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



//AUTO LOAD (PAGE DETECTION) 

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

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("row-ep1")) {
        loadInboxState();
    }
});



