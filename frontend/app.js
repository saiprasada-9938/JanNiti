/* =====================================================
   JAN NITI - UNIFIED APPLICATION
   Combined Citizen + Admin JavaScript
   ===================================================== */

const API_BASE_URL = window.CIVICAI_API_URL || "https://janniti.antideploy.com";


/* =====================================================
   ADMIN AUTHENTICATION
===================================================== */

function getAdminToken() {
    return localStorage.getItem("adminToken");
}

function setAdminToken(token) {
    localStorage.setItem("adminToken", token);
}

function clearAdminToken() {
    localStorage.removeItem("adminToken");
}

function adminAuthHeaders() {
    const token = getAdminToken();
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

async function verifyAdminToken() {
    const token = getAdminToken();
    if (!token) return false;
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify?token=${encodeURIComponent(token)}`);
        return response.ok;
    } catch {
        return false;
    }
}

function showAdminLogin() {
    document.getElementById("adminLoginScreen").classList.remove("hidden");
    document.getElementById("adminDashboard").classList.add("hidden");
}

function showAdminDashboard() {
    document.getElementById("adminLoginScreen").classList.add("hidden");
    document.getElementById("adminDashboard").classList.remove("hidden");
}


/* =====================================================
   PORTAL SWITCHING
===================================================== */

async function showPortal(portal) {
    document.getElementById("landingPage").style.display = "none";
    document.getElementById("citizenPortal").classList.add("hidden");
    document.getElementById("citizenPortal").classList.remove("active-portal");
    document.getElementById("adminPortal").classList.add("hidden");
    document.getElementById("adminPortal").classList.remove("active-portal");

    if (portal === "landing") {
        document.getElementById("landingPage").style.display = "block";
    } else if (portal === "citizen") {
        document.getElementById("citizenPortal").classList.remove("hidden");
        document.getElementById("citizenPortal").classList.add("active-portal");
    } else if (portal === "admin") {
        document.getElementById("adminPortal").classList.remove("hidden");
        document.getElementById("adminPortal").classList.add("active-portal");

        const isAuthenticated = await verifyAdminToken();
        if (isAuthenticated) {
            showAdminDashboard();
            adminSetCurrentDate();
            adminLoadAllData();
        } else {
            showAdminLogin();
        }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}


/* =====================================================
   SHARED UTILITIES
===================================================== */

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showToast(message) {
    const citizenToast = document.getElementById("citizenToast");
    const adminToast = document.getElementById("adminToast");

    if (citizenToast && document.getElementById("citizenPortal").classList.contains("active-portal")) {
        citizenToast.textContent = message;
        citizenToast.classList.add("show");
        setTimeout(() => citizenToast.classList.remove("show"), 2500);
    } else if (adminToast && document.getElementById("adminPortal").classList.contains("active-portal")) {
        adminToast.textContent = message;
        adminToast.classList.add("show");
        setTimeout(() => adminToast.classList.remove("show"), 2500);
    }
}


/* =====================================================
   CITIZEN PORTAL - MOBILE MENU
===================================================== */

const mobileMenu = document.getElementById("mobileMenu");
const navbar = document.querySelector("#citizenPortal .navbar");

if (mobileMenu && navbar) {
    mobileMenu.addEventListener("click", () => {
        navbar.classList.toggle("show");
    });

    document.querySelectorAll("#citizenPortal .nav-link").forEach(link => {
        link.addEventListener("click", () => {
            navbar.classList.remove("show");
        });
    });
}


/* =====================================================
   CITIZEN PORTAL - SECTION NAVIGATION
===================================================== */

function showCitizenSection(section) {
    document.querySelectorAll(".citizen-section").forEach(s => {
        s.classList.remove("active-section");
    });

    const target = document.getElementById("citizen-" + section);
    if (target) {
        target.classList.add("active-section");
    }

    document.querySelectorAll("[data-citizen-nav]").forEach(link => {
        link.classList.remove("active");
        if (link.dataset.citizenNav === section) {
            link.classList.add("active");
        }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}


/* =====================================================
   CITIZEN PORTAL - PHOTO PREVIEW
===================================================== */

const photoInput = document.getElementById("photo");
const photoPreview = document.getElementById("photoPreview");
const fileName = document.getElementById("fileName");

if (photoInput) {
    photoInput.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) {
            photoPreview.style.display = "none";
            fileName.textContent = "";
            return;
        }
        fileName.textContent = `Selected file: ${file.name}`;
        const reader = new FileReader();
        reader.onload = function (event) {
            photoPreview.src = event.target.result;
            photoPreview.style.display = "block";
        };
        reader.readAsDataURL(file);
    });
}


/* =====================================================
   CITIZEN PORTAL - PHOTO UPLOAD
===================================================== */

let citizenAnalyzedPhotoFilename = null;
let citizenAnalyzedPhotoData = null;
let citizenPhotoUploadPromise = null;

if (photoInput) {
    photoInput.addEventListener("change", async function () {
        const file = this.files[0];
        const analysisBox = document.getElementById("photoAnalysis");

        citizenAnalyzedPhotoFilename = null;
        citizenAnalyzedPhotoData = null;
        analysisBox.classList.add("hidden");

        if (!file) return;

        if (file.size > 8 * 1024 * 1024) {
            alert("Photo must be 8 MB or smaller.");
            this.value = "";
            return;
        }

        analysisBox.classList.remove("hidden");
        analysisBox.innerHTML = "<strong>Uploading photo...</strong><br>AI analysis will run after your complaint is submitted.";

        citizenPhotoUploadPromise = (async () => {
            try {
                const formData = new FormData();
                formData.append("file", file);
                const response = await fetch(`${API_BASE_URL}/api/submissions/upload-photo`, {
                    method: "POST",
                    body: formData
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.detail || "Photo analysis failed");
                citizenAnalyzedPhotoFilename = result.data.photo_filename;
                analysisBox.innerHTML = "<strong>Photo attached.</strong><br>AI analysis will appear in the Admin portal shortly after submission.";
            } catch (error) {
                console.error("Photo analysis error:", error);
                citizenAnalyzedPhotoFilename = null;
                analysisBox.innerHTML = "<strong>Photo upload unavailable.</strong><br>You can still submit the complaint.";
            }
        })();

        await citizenPhotoUploadPromise;
    });
}


/* =====================================================
   CITIZEN PORTAL - VOICE COMPLAINT
===================================================== */

const voiceButton = document.getElementById("voiceButton");
const voiceStatus = document.getElementById("voiceStatus");
const descriptionInput = document.getElementById("description");

if (voiceButton) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        voiceButton.disabled = true;
        voiceStatus.textContent = "Voice input is not supported in this browser. Try Chrome or Edge.";
    } else {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-IN";

        const speechLanguages = {
            English: "en-IN", Hindi: "hi-IN", Bengali: "bn-IN", Gujarati: "gu-IN",
            Kannada: "kn-IN", Malayalam: "ml-IN", Marathi: "mr-IN", Punjabi: "pa-IN",
            Tamil: "ta-IN", Telugu: "te-IN", Urdu: "ur-IN", Odia: "or-IN"
        };

        voiceButton.addEventListener("click", () => {
            try {
                const selectedLanguage = document.getElementById("language").value;
                recognition.lang = speechLanguages[selectedLanguage] || "en-IN";
                recognition.start();
                voiceButton.classList.add("recording");
                voiceButton.textContent = "⏺ Listening...";
                voiceStatus.textContent = "Speak clearly about the civic problem.";
            } catch (error) {
                console.log("Voice recognition already running.");
            }
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim();
            descriptionInput.value = descriptionInput.value.trim()
                ? `${descriptionInput.value.trim()} ${transcript}`
                : transcript;
            descriptionInput.dispatchEvent(new Event("input"));
            voiceStatus.textContent = "Voice complaint added to the description.";
        };

        recognition.onerror = (event) => {
            voiceStatus.textContent = `Voice input error: ${event.error}`;
        };

        recognition.onend = () => {
            voiceButton.classList.remove("recording");
            voiceButton.textContent = "🎤 Speak Complaint";
        };
    }
}


/* =====================================================
   CITIZEN PORTAL - SIMILAR COMPLAINT DETECTION
===================================================== */

const similarButton = document.getElementById("similarButton");
const similarResults = document.getElementById("similarResults");

if (similarButton) {
    similarButton.addEventListener("click", async () => {
        const category = document.getElementById("category").value;
        const village = document.getElementById("village").value.trim();
        const description = descriptionInput.value.trim();

        if (description.length < 5) {
            alert("Please describe the problem first.");
            return;
        }

        similarResults.classList.remove("hidden");
        similarResults.innerHTML = "<strong>🔎 Checking previous complaints...</strong>";

        try {
            const response = await fetch(`${API_BASE_URL}/api/submissions/similar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: `${category || "Civic"} complaint in ${village || "local area"}`,
                    description,
                    category: category || null,
                    limit: 3
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || "Similar complaint check failed");

            if (!result.data.length) {
                similarResults.innerHTML = "<strong>✅ No strong similar complaint found.</strong><br>You can continue with a new submission.";
                return;
            }

            similarResults.innerHTML = `
                <strong>🔎 Possible duplicate / related complaints</strong>
                ${result.data.map(item => `
                    <div class="smart-result-card">
                        <span class="similarity-badge">${item.similarity}% similar · ${escapeHtml(item.complaint_id)}</span>
                        <div><b>${escapeHtml(item.title)}</b></div>
                        <div>${escapeHtml(item.description)}</div>
                        <small>${escapeHtml(item.village)}, ${escapeHtml(item.district)} · ${escapeHtml(item.status)}</small>
                    </div>
                `).join("")}
            `;
        } catch (error) {
            console.error("Similar complaint error:", error);
            similarResults.innerHTML = "<strong>Similar complaint check unavailable.</strong>";
        }
    });
}


/* =====================================================
   CITIZEN PORTAL - SUBMIT COMPLAINT
===================================================== */

let citizenComplaintSubmitting = false;
const complaintForm = document.getElementById("complaintForm");

function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        });
    });
}

if (complaintForm) {
    complaintForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (citizenComplaintSubmitting) {
            console.log("Duplicate submission blocked.");
            return;
        }

        citizenComplaintSubmitting = true;

        const selectedSeverity = document.querySelector('input[name="severity"]:checked');
        if (!selectedSeverity) {
            alert("Please select severity.");
            citizenComplaintSubmitting = false;
            return;
        }

        const name = document.getElementById("name").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const village = document.getElementById("village").value.trim();
        const district = document.getElementById("district").value.trim();
        const category = document.getElementById("category").value;
        const language = document.getElementById("language").value;
        const severity = selectedSeverity.value;
        const description = document.getElementById("description").value.trim();

        try {
            if (citizenPhotoUploadPromise) await citizenPhotoUploadPromise;

            const position = await getUserLocation();
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            console.log("Real GPS location:", latitude, longitude);

            const response = await fetch(`${API_BASE_URL}/api/submissions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: `${category} complaint in ${village}`,
                    description: description,
                    category: category,
                    severity: severity,
                    ward: `${village}, ${district}`,
                    name: name,
                    phone: phone,
                    village: village,
                    district: district,
                    language: language,
                    latitude: latitude,
                    longitude: longitude,
                    photo_filename: citizenAnalyzedPhotoFilename,
                    photo_analysis: citizenAnalyzedPhotoData ? JSON.stringify(citizenAnalyzedPhotoData) : null
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Backend error:", errorData);
                alert("Failed to submit complaint. Please try again.");
                return;
            }

            const result = await response.json();
            console.log("Backend response:", result);

            const backendId = result.data?.id || result.id;
            const complaintId = backendId ? `CMP-${backendId}` : generateComplaintId();

            localStorage.setItem("lastComplaintId", complaintId);

            document.getElementById("generatedId").textContent = complaintId;
            document.getElementById("success").classList.remove("hidden");

            complaintForm.reset();
            photoPreview.style.display = "none";
            fileName.textContent = "";
            citizenAnalyzedPhotoFilename = null;
            citizenAnalyzedPhotoData = null;
            citizenPhotoUploadPromise = null;
            document.getElementById("photoAnalysis").classList.add("hidden");
            similarResults.classList.add("hidden");
            voiceStatus.textContent = "";

            document.getElementById("success").scrollIntoView({ behavior: "smooth" });
            console.log("Complaint successfully stored in database:", result);

        } catch (error) {
            console.error("Connection error:", error);
            alert("Cannot connect to backend. Make sure FastAPI is running on port 8010.");
        } finally {
            citizenComplaintSubmitting = false;
        }
    });
}

function generateComplaintId() {
    const count = parseInt(localStorage.getItem("complaintCount") || "0") + 1;
    localStorage.setItem("complaintCount", count.toString());
    return `CMP-${count}`;
}


/* =====================================================
   CITIZEN PORTAL - TRACK COMPLAINT
===================================================== */

const trackForm = document.getElementById("trackForm");

if (trackForm) {
    trackForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const enteredId = document.getElementById("trackId").value.trim().toUpperCase();
        const result = document.getElementById("trackResult");
        result.classList.remove("hidden");

        const submissionId = enteredId.replace(/^CMP-/i, "");

        if (!submissionId || isNaN(submissionId)) {
            result.innerHTML = `
                <div style="text-align:center; padding:20px;">
                    <div style="font-size:35px; margin-bottom:10px;">⚠️</div>
                    <h3>Invalid Complaint ID</h3>
                    <p style="color:#64748b; margin-top:5px;">Please enter a valid Complaint ID such as CMP-1.</p>
                </div>
            `;
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}`);

            if (!response.ok) {
                if (response.status === 404) throw new Error("Complaint not found");
                throw new Error("Failed to fetch complaint");
            }

            const responseData = await response.json();
            const complaint = responseData.data ?? responseData;

            if (!complaint || !complaint.id) {
                result.innerHTML = `
                    <div style="text-align:center; padding:20px;">
                        <div style="font-size:35px; margin-bottom:10px;">⚠️</div>
                        <h3>Complaint Not Found</h3>
                        <p style="color:#64748b; margin-top:5px;">Please check your Complaint ID and try again.</p>
                    </div>
                `;
                return;
            }

            const status = complaint.status || "Submitted";
            const submittedComplete = true;
            const underReviewComplete = status === "Under Review" || status === "Action Planned" || status === "Resolved";
            const actionComplete = status === "Action Planned" || status === "Resolved";
            const resolvedComplete = status === "Resolved";

            let submittedDate = "N/A";
            if (complaint.created_at) {
                submittedDate = new Date(complaint.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric"
                });
            }

            result.innerHTML = `
                <div class="result-header">
                    <div>
                        <h3>${complaint.category || "Complaint"}</h3>
                        <p>Complaint ID: <strong>CMP-${complaint.id}</strong></p>
                        <p>Submitted: ${submittedDate}</p>
                    </div>
                    <div class="status-badge">${status}</div>
                </div>
                <div style="margin-top:20px; padding:15px; background:#f8fafc; border-radius:8px;">
                    <p style="font-size:12px; color:#64748b;">LOCATION</p>
                    <strong>${complaint.ward || ""}</strong>
                    <p style="font-size:12px; color:#64748b; margin-top:12px;">PROBLEM</p>
                    <p>${complaint.description || ""}</p>
                </div>
                <div class="timeline">
                    <div class="timeline-item ${submittedComplete ? "completed" : ""}">
                        <strong>Complaint Submitted</strong>
                        <p>Your complaint has been received.</p>
                    </div>
                    <div class="timeline-item ${underReviewComplete ? "completed" : "current"}">
                        <strong>Under Review</strong>
                        <p>The complaint is being reviewed.</p>
                    </div>
                    <div class="timeline-item ${actionComplete ? "completed" : ""}">
                        <strong>Action Planned</strong>
                        <p>Appropriate action is being planned.</p>
                    </div>
                    <div class="timeline-item ${resolvedComplete ? "completed" : ""}">
                        <strong>Resolved</strong>
                        <p>The complaint has been resolved.</p>
                    </div>
                </div>
            `;

            result.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (error) {
            console.error("Tracking error:", error);
            result.innerHTML = `
                <div style="text-align:center; padding:20px;">
                    <div style="font-size:35px; margin-bottom:10px;">❌</div>
                    <h3>Unable to Track Complaint</h3>
                    <p style="color:#64748b; margin-top:5px;">${error.message}</p>
                </div>
            `;
        }
    });
}


/* =====================================================
   CITIZEN PORTAL - COPY COMPLAINT ID
===================================================== */

function copyComplaintId() {
    const id = document.getElementById("generatedId").textContent;
    navigator.clipboard.writeText(id);
    showToast("Complaint ID copied!");
}


/* =====================================================
   CITIZEN PORTAL - AUTO-FILL LAST COMPLAINT ID
===================================================== */

window.addEventListener("load", function () {
    const lastId = localStorage.getItem("lastComplaintId");
    const trackIdInput = document.getElementById("trackId");
    if (lastId && trackIdInput) {
        trackIdInput.value = lastId;
    }
});


/* =====================================================
   ADMIN PORTAL - GLOBAL VARIABLES
===================================================== */

let adminSelectedComplaintId = null;
let adminComplaintsCache = [];
let adminPriorityCache = [];

function adminParsePhotoAnalysis(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch (error) { return { description: String(value) }; }
}

function adminMakeReadableSummary(value, fallback) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return fallback;
    return text.length > 240 ? `${text.slice(0, 237).trimEnd()}…` : text;
}

function adminRenderPhotoEvidence(complaint) {
    if (!complaint.photo_filename) return "";
    const analysis = adminParsePhotoAnalysis(complaint.photo_analysis);
    const isPending = ["Pending", "Processing"].includes(complaint.ai_status);
    const issue = analysis.issue_type || (isPending ? "Photo analysis in progress" : "Uploaded civic issue");
    const evidence = adminMakeReadableSummary(analysis.visible_evidence || analysis.description,
        isPending ? "The photo is saved and AI analysis will appear shortly."
            : "The uploaded photo is available for administrative review.");
    const imageUrl = `${API_BASE_URL}/uploads/${encodeURIComponent(complaint.photo_filename)}`;

    return `
        <section class="photo-evidence">
            <div class="photo-evidence__image-wrap">
                <img class="photo-evidence__image" src="${imageUrl}" alt="Evidence photo for complaint CMP-${escapeHtml(complaint.id)}">
            </div>
            <div class="photo-evidence__content">
                <span class="photo-evidence__eyebrow">${isPending ? "PHOTO EVIDENCE — ANALYSIS PENDING" : "AI-REVIEWED PHOTO EVIDENCE"}</span>
                <h3>${escapeHtml(issue)}</h3>
                <p>${escapeHtml(evidence)}</p>
                <span class="photo-evidence__hint">Photo-based assessment. Confirm on site before assigning work.</span>
            </div>
        </section>
    `;
}


/* =====================================================
   ADMIN PORTAL - GET/UPDATE COMPLAINTS
===================================================== */

function adminGetComplaints() { return adminComplaintsCache; }

async function adminUpdateComplaintStatusAPI(complaintId, newStatus) {
    const response = await fetch(`${API_BASE_URL}/api/submissions/${complaintId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...adminAuthHeaders() },
        body: JSON.stringify({ status: newStatus })
    });

    if (response.status === 401) {
        clearAdminToken();
        showAdminLogin();
        throw new Error("Session expired");
    }

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Status update error:", errorData);
        throw new Error("Failed to update complaint status");
    }
    return await response.json();
}


/* =====================================================
   ADMIN PORTAL - NAVIGATION
===================================================== */

const adminNavButtons = document.querySelectorAll("#adminPortal .nav-button");
const adminPageSections = document.querySelectorAll("#adminPortal .page-section");
const adminPageTitle = document.getElementById("pageTitle");

const adminPageTitles = {
    dashboard: "Development Dashboard",
    complaints: "Complaint Management",
    analysis: "Complaint Analysis",
    priority: "Priority Issues"
};

function adminShowPage(sectionName) {
    adminPageSections.forEach(section => section.classList.remove("active-section"));
    const selectedSection = document.getElementById(sectionName);
    if (selectedSection) selectedSection.classList.add("active-section");
    adminPageTitle.textContent = adminPageTitles[sectionName] || "Government Administration";

    adminNavButtons.forEach(button => {
        button.classList.remove("active");
        if (button.dataset.section === sectionName) button.classList.add("active");
    });

    adminLoadAllData();
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.getElementById("sidebar").classList.remove("open");
}

adminNavButtons.forEach(button => {
    button.addEventListener("click", function() { adminShowPage(this.dataset.section); });
});

document.querySelectorAll("[data-section-target]").forEach(button => {
    button.addEventListener("click", function() { adminShowPage(this.dataset.sectionTarget); });
});


/* =====================================================
   ADMIN PORTAL - MOBILE MENU
===================================================== */

document.getElementById("menuButton").addEventListener("click", function() {
    document.getElementById("sidebar").classList.toggle("open");
});


/* =====================================================
   ADMIN PORTAL - CURRENT DATE
===================================================== */

function adminSetCurrentDate() {
    const dateElement = document.getElementById("currentDate");
    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString("en-IN", {
            day: "2-digit", month: "long", year: "numeric"
        });
    }
}


/* =====================================================
   ADMIN PORTAL - PRIORITY SCORE
===================================================== */

function adminCalculatePriority(complaint) {
    const category = (complaint.ai_category || complaint.ml_category || complaint.category || "Other").trim().toLowerCase();
    const priorityData = adminPriorityCache.find(item => item.category && item.category.trim().toLowerCase() === category);
    return priorityData ? Number(priorityData.final_priority_score || 0) : 0;
}

function adminGetPriorityClass(score) {
    if (score >= 80) return "priority-high";
    if (score >= 60) return "priority-medium";
    return "priority-low";
}

function adminGetSeverityClass(severity) {
    if (severity === "High") return "severity-high";
    if (severity === "Medium") return "severity-medium";
    return "severity-low";
}

function adminGetStatusClass(status) {
    if (status === "Under Review") return "status-review";
    if (status === "Action Planned") return "status-action";
    if (status === "Resolved") return "status-resolved";
    return "status-submitted";
}


/* =====================================================
   ADMIN PORTAL - LOAD DATA
===================================================== */

async function adminLoadPriorityScores() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/submissions/priorities`, {
            headers: adminAuthHeaders()
        });
        if (response.status === 401) return;
        if (!response.ok) throw new Error("Failed to load priority scores");
        const responseData = await response.json();
        adminPriorityCache = Array.isArray(responseData) ? responseData : (responseData.data || responseData.results || []);
    } catch (error) {
        console.error("Priority API error:", error);
        adminPriorityCache = [];
    }
}

async function adminLoadAllData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/submissions/`, {
            headers: adminAuthHeaders()
        });

        if (response.status === 401) {
            clearAdminToken();
            showAdminLogin();
            showToast("Session expired. Please log in again.");
            return;
        }

        if (!response.ok) throw new Error("Failed to load complaints");
        const responseData = await response.json();

        adminComplaintsCache = Array.isArray(responseData) ? responseData : (responseData.data || responseData.results || []);

        adminComplaintsCache = adminComplaintsCache.map(complaint => {
            const photoAnalysis = adminParsePhotoAnalysis(complaint.photo_analysis);
            return {
                ...complaint,
                status: complaint.status || "Submitted",
                severity: complaint.severity || photoAnalysis.severity || "Not assessed",
                ai_status: complaint.ai_status || "Complete",
                location: complaint.village || complaint.district || "Not specified"
            };
        });

        await adminLoadPriorityScores();

        adminUpdateStatistics(adminComplaintsCache);
        adminRenderDashboardTable(adminComplaintsCache);
        adminRenderComplaintsTable(adminComplaintsCache);
        adminRenderPriorityList(adminComplaintsCache);
        adminRenderCategoryList(adminComplaintsCache);
        adminRenderAnalysis(adminComplaintsCache);
        adminRenderPriorityTable(adminComplaintsCache);

    } catch (error) {
        console.error("Backend loading error:", error);
        adminComplaintsCache = [];
        adminUpdateStatistics(adminComplaintsCache);
        adminRenderDashboardTable(adminComplaintsCache);
        adminRenderComplaintsTable(adminComplaintsCache);
        adminRenderPriorityList(adminComplaintsCache);
        adminRenderCategoryList(adminComplaintsCache);
        adminRenderAnalysis(adminComplaintsCache);
        adminRenderPriorityTable(adminComplaintsCache);
        showToast("Cannot connect to CivicAI backend.");
    }
}


/* =====================================================
   ADMIN PORTAL - STATISTICS
===================================================== */

function adminUpdateStatistics(complaints) {
    const total = complaints.length;
    const pending = complaints.filter(c => c.status === "Submitted").length;
    const review = complaints.filter(c => c.status === "Under Review").length;
    const resolved = complaints.filter(c => c.status === "Resolved").length;

    document.getElementById("totalComplaints").textContent = total;
    document.getElementById("pendingComplaints").textContent = pending;
    document.getElementById("reviewComplaints").textContent = review;
    document.getElementById("resolvedComplaints").textContent = resolved;
    document.getElementById("notificationCount").textContent = pending;
}


/* =====================================================
   ADMIN PORTAL - DASHBOARD TABLE
===================================================== */

function adminRenderDashboardTable(complaints) {
    const table = document.getElementById("dashboardTable");
    if (complaints.length === 0) {
        table.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:35px; color:#71808A;">No complaints submitted yet.</td></tr>`;
        return;
    }
    const recent = [...complaints].reverse().slice(0, 6);
    table.innerHTML = recent.map(c => adminCreateTableRow(c, false)).join("");
}


/* =====================================================
   ADMIN PORTAL - COMPLAINT TABLE
===================================================== */

function adminRenderComplaintsTable(complaints) {
    const table = document.getElementById("complaintsTable");
    const search = document.getElementById("searchInput").value.toLowerCase();
    const status = document.getElementById("statusFilter").value;
    const severity = document.getElementById("severityFilter").value;

    const filtered = complaints.filter(c => {
        const text = `${c.id} ${c.category} ${c.village} ${c.district} ${c.name}`.toLowerCase();
        return text.includes(search) && (status === "All" || c.status === status) && (severity === "All" || c.severity === severity);
    });

    if (filtered.length === 0) {
        table.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:#71808A;">No matching complaints found.</td></tr>`;
        return;
    }

    table.innerHTML = filtered.slice().reverse().map(c => adminCreateTableRow(c, true)).join("");
}


/* =====================================================
   ADMIN PORTAL - CREATE TABLE ROW
===================================================== */

function adminCreateTableRow(complaint, detailed) {
    const priority = adminCalculatePriority(complaint);
    const severityClass = adminGetSeverityClass(complaint.severity);
    const statusClass = adminGetStatusClass(complaint.status);

    return `
        <tr>
            <td><span class="complaint-id">CMP-${complaint.id}</span></td>
            <td><strong>${complaint.category || "General"}</strong></td>
            ${detailed ? `<td>${complaint.name || "Citizen"}</td>` : ""}
            <td>${complaint.village || complaint.district || complaint.location || "Not specified"}</td>
            <td><span class="${severityClass}">${complaint.severity || "Low"}</span></td>
            <td><span class="admin-status-badge ${statusClass}">${complaint.status || "Submitted"}</span></td>
            <td><span class="${adminGetPriorityClass(priority)}">${priority}</span></td>
            <td><button class="view-button" onclick="adminOpenComplaint('${complaint.id}')">View</button></td>
        </tr>
    `;
}


/* =====================================================
   ADMIN PORTAL - PRIORITY LIST
===================================================== */

function adminRenderPriorityList(complaints) {
    const container = document.getElementById("dashboardPriorityList");
    if (!adminPriorityCache.length) {
        container.innerHTML = `<p style="color:#71808A; font-size:10px; padding:15px 0;">AI priority analysis will appear after complaints are submitted.</p>`;
        return;
    }
    const sorted = [...adminPriorityCache].sort((a, b) => Number(b.final_priority_score || 0) - Number(a.final_priority_score || 0)).slice(0, 5);
    container.innerHTML = sorted.map((item, index) => {
        const score = Number(item.final_priority_score || 0);
        return `
            <div class="priority-item">
                <div class="rank-circle">${String(index + 1).padStart(2, "0")}</div>
                <div class="priority-info"><strong>${item.category}</strong><small>${item.total_complaints} complaint(s)</small></div>
                <div class="priority-score"><strong>${score.toFixed(2)}</strong><small>Priority</small></div>
            </div>
        `;
    }).join("");
}


/* =====================================================
   ADMIN PORTAL - CATEGORY LIST
===================================================== */

function adminGetCategoryCounts(complaints) {
    const categories = {};
    complaints.forEach(c => { const cat = c.category || "General"; categories[cat] = (categories[cat] || 0) + 1; });
    return Object.fromEntries(Object.entries(categories).sort(([, a], [, b]) => b - a));
}

function adminRenderCategoryList(complaints) {
    const container = document.getElementById("dashboardCategoryList");
    if (complaints.length === 0) {
        container.innerHTML = `<p style="color:#71808A; font-size:10px; padding:15px 0;">No category data available.</p>`;
        return;
    }
    const categories = adminGetCategoryCounts(complaints);
    const max = Math.max(...Object.values(categories));
    container.innerHTML = Object.entries(categories).map(([category, count]) => {
        const width = Math.round((count / max) * 100);
        return `
            <div class="category-item">
                <div class="category-heading"><span>${category}</span><strong>${count}</strong></div>
                <div class="progress"><div class="progress-bar" style="width:${width}%;"></div></div>
            </div>
        `;
    }).join("");
}


/* =====================================================
   ADMIN PORTAL - ANALYSIS
===================================================== */

function adminRenderAnalysis(complaints) {
    adminRenderAnalysisCategories(complaints);
    adminRenderStatusAnalysis(complaints);
    adminRenderSummary(complaints);
}

function adminRenderAnalysisCategories(complaints) {
    const container = document.getElementById("analysisCategoryList");
    const categories = adminGetCategoryCounts(complaints);
    if (Object.keys(categories).length === 0) {
        container.innerHTML = `<p style="color:#71808A; font-size:10px;">No data available.</p>`;
        return;
    }
    const total = complaints.length;
    container.innerHTML = Object.entries(categories).map(([category, count]) => {
        const percentage = Math.round((count / total) * 100);
        return `
            <div class="category-item">
                <div class="category-heading"><span>${category}</span><strong>${count} (${percentage}%)</strong></div>
                <div class="progress"><div class="progress-bar" style="width:${percentage}%;"></div></div>
            </div>
        `;
    }).join("");
}

function adminRenderStatusAnalysis(complaints) {
    const container = document.getElementById("statusAnalysis");
    const statuses = { "Submitted": 0, "Under Review": 0, "Action Planned": 0, "Resolved": 0 };
    complaints.forEach(c => { if (statuses[c.status] !== undefined) statuses[c.status]++; });
    const total = complaints.length || 1;
    container.innerHTML = Object.entries(statuses).map(([status, count]) => {
        const percentage = Math.round((count / total) * 100);
        return `
            <div class="category-item">
                <div class="category-heading"><span>${status}</span><strong>${count}</strong></div>
                <div class="progress"><div class="progress-bar" style="width:${percentage}%;"></div></div>
            </div>
        `;
    }).join("");
}

function adminRenderSummary(complaints) {
    const container = document.getElementById("summaryGrid");
    const high = complaints.filter(c => c.severity === "High").length;
    const medium = complaints.filter(c => c.severity === "Medium").length;
    const low = complaints.filter(c => c.severity === "Low").length;
    const resolved = complaints.filter(c => c.status === "Resolved").length;
    container.innerHTML = `
        <div class="summary-box"><span>High Severity</span><strong>${high}</strong></div>
        <div class="summary-box"><span>Medium Severity</span><strong>${medium}</strong></div>
        <div class="summary-box"><span>Low Severity</span><strong>${low}</strong></div>
        <div class="summary-box"><span>Resolved</span><strong>${resolved}</strong></div>
    `;
}


/* =====================================================
   ADMIN PORTAL - PRIORITY TABLE
===================================================== */

function adminRenderPriorityTable(complaints) {
    const table = document.getElementById("priorityTable");
    if (!adminPriorityCache.length) {
        table.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:#71808A;">No AI priority analysis available.</td></tr>`;
        return;
    }
    const sorted = [...adminPriorityCache].sort((a, b) => Number(b.final_priority_score || 0) - Number(a.final_priority_score || 0));
    table.innerHTML = sorted.map((item, index) => {
        const score = Number(item.final_priority_score || 0);
        const breakdown = item.priority_breakdown || {};
        return `
            <tr>
                <td><strong>#${index + 1}</strong></td>
                <td><strong>${item.category}</strong></td>
                <td>${item.total_complaints}</td>
                <td>${breakdown.citizen_demand ?? 0}/30</td>
                <td>${breakdown.severity ?? 0}/25</td>
                <td>${breakdown.hotspot_concentration ?? 0}/20</td>
                <td><span class="${adminGetPriorityClass(score)}">${score.toFixed(2)}</span></td>
                <td><span class="${adminGetPriorityClass(score)}">${score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW"}</span></td>
            </tr>
        `;
    }).join("");
}


/* =====================================================
   ADMIN PORTAL - IMPACT ANALYSIS
===================================================== */

function adminCalculateImpactAnalysis(complaint) {
    const category = (complaint.ai_category || complaint.ml_category || complaint.category || "Other").trim().toLowerCase();
    const priority = Number(adminCalculatePriority(complaint) || 0);
    const severity = complaint.severity || "Medium";

    const categoryImpact = {
        road: { radius: 2, baseAffected: 1200, benefitRate: 0.90 },
        water: { radius: 3, baseAffected: 1800, benefitRate: 0.95 },
        education: { radius: 2.5, baseAffected: 1500, benefitRate: 0.85 },
        health: { radius: 4, baseAffected: 2200, benefitRate: 0.92 },
        electricity: { radius: 2, baseAffected: 1400, benefitRate: 0.90 },
        sanitation: { radius: 1.5, baseAffected: 1000, benefitRate: 0.88 },
        other: { radius: 1, baseAffected: 700, benefitRate: 0.80 }
    };

    const impact = categoryImpact[category] || categoryImpact.other;
    const severityMultiplier = { High: 1.5, Medium: 1.0, Low: 0.6 };
    const multiplier = severityMultiplier[severity] || 1.0;
    const priorityMultiplier = 1 + (priority / 200);
    const affected = Math.round(impact.baseAffected * multiplier * priorityMultiplier);
    const beneficiaries = Math.round(affected * impact.benefitRate);
    const socialImpactScore = Math.min(100, Math.round((priority * 0.6) + (severity === "High" ? 30 : severity === "Medium" ? 20 : 10)));

    let impactLevel = "Low";
    if (socialImpactScore >= 70) impactLevel = "High";
    else if (socialImpactScore >= 40) impactLevel = "Medium";

    return {
        impactRadius: impact.radius,
        estimatedAffected: affected,
        estimatedBeneficiaries: beneficiaries,
        socialImpactScore: socialImpactScore,
        impactLevel: impactLevel
    };
}


/* =====================================================
   ADMIN PORTAL - OPEN COMPLAINT MODAL
===================================================== */

function adminOpenComplaint(complaintId) {
    const complaints = adminGetComplaints();
    const complaint = complaints.find(item => String(item.id) === String(complaintId));

    if (!complaint) { showToast("Complaint not found."); return; }

    adminSelectedComplaintId = complaintId;

    document.getElementById("modalTitle").textContent = complaint.category || "Complaint";
    document.getElementById("modalId").textContent = `Complaint ID: CMP-${complaint.id}`;
    document.getElementById("modalDescription").textContent = complaint.description || "No description provided.";
    document.getElementById("modalStatus").value = complaint.status || "Submitted";

    const priority = adminCalculatePriority(complaint);
    const priorityData = adminGetComplaintPriorityData(complaint);
    const impactData = adminCalculateImpactAnalysis(complaint);

    document.getElementById("modalDetails").innerHTML = `
        <div class="detail-box"><span>Citizen Name</span><strong>${complaint.name || "Not provided"}</strong></div>
        <div class="detail-box"><span>Mobile Number</span><strong>${complaint.phone || "Not provided"}</strong></div>
        <div class="detail-box"><span>Category</span><strong>${complaint.category || "General"}</strong></div>
        <div class="detail-box"><span>Severity</span><strong>${complaint.severity || "Medium"}</strong></div>
        <div class="detail-box"><span>Village</span><strong>${complaint.village || "Not provided"}</strong></div>
        <div class="detail-box"><span>District</span><strong>${complaint.district || "Not provided"}</strong></div>
        <div class="detail-box"><span>Ward</span><strong>${complaint.ward || "Not provided"}</strong></div>
        <div class="detail-box"><span>Language</span><strong>${complaint.language || "Not provided"}</strong></div>
        <div class="detail-box"><span>GPS Latitude</span><strong>${complaint.latitude != null ? complaint.latitude : "Not available"}</strong></div>
        <div class="detail-box"><span>GPS Longitude</span><strong>${complaint.longitude != null ? complaint.longitude : "Not available"}</strong></div>
        <div class="detail-box"><span>Submitted Date</span><strong>${complaint.created_at ? new Date(complaint.created_at).toLocaleString("en-IN") : "Not provided"}</strong></div>
        ${adminRenderPhotoEvidence(complaint)}
        <div class="detail-box"><span>Priority Score</span><strong>${priority}</strong></div>
        ${priorityData ? `
            <div class="detail-box" style="grid-column: 1 / -1; margin-top: 10px;"><span>AI PRIORITY BREAKDOWN</span><strong>${priorityData.explanation}</strong></div>
            <div class="detail-box"><span>Citizen Demand</span><strong>${priorityData.priority_breakdown.citizen_demand} / 30</strong></div>
            <div class="detail-box"><span>Urgency contribution</span><strong>${priorityData.priority_breakdown.severity} / 25</strong></div>
            <div class="detail-box"><span>Hotspot Concentration</span><strong>${priorityData.priority_breakdown.hotspot_concentration} / 20</strong></div>
            <div class="detail-box"><span>ML Confidence</span><strong>${priorityData.priority_breakdown.ml_confidence} / 10</strong></div>
            <div class="detail-box"><span>Active Demand</span><strong>${priorityData.priority_breakdown.active_demand} / 15</strong></div>
        ` : ""}
        <div class="detail-box" style="grid-column: 1 / -1; margin-top: 15px;"><span>MAP-BASED IMPACT ANALYSIS</span><strong>CivicAI Impact Estimation</strong></div>
        <div class="detail-box"><span>Estimated People Affected</span><strong>${impactData.estimatedAffected.toLocaleString("en-IN")} People</strong></div>
        <div class="detail-box"><span>Estimated Beneficiaries</span><strong>${impactData.estimatedBeneficiaries.toLocaleString("en-IN")} People</strong></div>
        <div class="detail-box"><span>Impact Radius</span><strong>${impactData.impactRadius} KM</strong></div>
        <div class="detail-box"><span>Social Impact Score</span><strong>${impactData.socialImpactScore}/100 (${impactData.impactLevel})</strong></div>
        ${complaint.latitude != null && complaint.longitude != null ? `
            <div class="detail-box"><span>GPS Location</span><strong><a href="https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a></strong></div>
        ` : ""}
        <div class="detail-box" style="grid-column: 1 / -1; margin-top: 15px;"><span>AI ANALYSIS</span><strong>CivicAI Intelligence</strong></div>
        <div class="detail-box"><span>AI Analysis Status</span><strong>${complaint.ai_status || "Complete"}</strong></div>
        <div class="detail-box"><span>AI Category</span><strong>${complaint.ai_category || "Not analyzed"}</strong></div>
        <div class="detail-box"><span>Recommended Department</span><strong>${complaint.ai_department || "Not determined"}</strong></div>
        <div class="detail-box" style="grid-column: 1 / -1;"><span>AI Summary</span><strong>${adminMakeReadableSummary(complaint.ai_summary, "No AI summary is available for this complaint.")}</strong></div>
        <div class="detail-box" style="grid-column: 1 / -1;"><span>AI Keywords</span><strong>${complaint.ai_keywords || "No keywords available."}</strong></div>
    `;

    document.getElementById("modalOverlay").classList.remove("hidden");
}


/* =====================================================
   ADMIN PORTAL - GET COMPLAINT PRIORITY DATA
===================================================== */

function adminGetComplaintPriorityData(complaint) {
    const category = (complaint.ai_category || complaint.ml_category || complaint.category || "Other").trim().toLowerCase();
    return adminPriorityCache.find(item => item.category && item.category.trim().toLowerCase() === category);
}


/* =====================================================
   ADMIN PORTAL - CLOSE MODAL
===================================================== */

document.getElementById("closeModal").addEventListener("click", adminCloseModal);

function adminCloseModal() {
    document.getElementById("modalOverlay").classList.add("hidden");
    adminSelectedComplaintId = null;
}

document.getElementById("modalOverlay").addEventListener("click", function(event) {
    if (event.target === this) adminCloseModal();
});


/* =====================================================
   ADMIN PORTAL - UPDATE STATUS
===================================================== */

document.getElementById("updateStatusButton").addEventListener("click", async function() {
    if (!adminSelectedComplaintId) return;
    const newStatus = document.getElementById("modalStatus").value;

    try {
        await adminUpdateComplaintStatusAPI(adminSelectedComplaintId, newStatus);
        await adminLoadAllData();
        adminCloseModal();
        showToast("Complaint status updated successfully.");
    } catch (error) {
        console.error("Status update failed:", error);
        showToast("Failed to update complaint status.");
    }
});


/* =====================================================
   ADMIN PORTAL - FILTER EVENTS
===================================================== */

document.getElementById("searchInput").addEventListener("input", function() {
    adminRenderComplaintsTable(adminGetComplaints());
});

document.getElementById("statusFilter").addEventListener("change", function() {
    adminRenderComplaintsTable(adminGetComplaints());
});

document.getElementById("severityFilter").addEventListener("change", function() {
    adminRenderComplaintsTable(adminGetComplaints());
});

document.getElementById("refreshButton").addEventListener("click", function() {
    adminLoadAllData();
    showToast("Dashboard data refreshed.");
});


/* =====================================================
   ADMIN PORTAL - LOGIN FORM
===================================================== */

document.getElementById("adminLoginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value;
    const errorEl = document.getElementById("adminLoginError");
    const btnText = document.querySelector(".admin-login-btn-text");
    const btnLoading = document.querySelector(".admin-login-btn-loading");
    const loginBtn = document.getElementById("adminLoginBtn");

    errorEl.classList.add("hidden");
    loginBtn.disabled = true;
    btnText.classList.add("hidden");
    btnLoading.classList.remove("hidden");

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Invalid credentials");
        }

        setAdminToken(data.access_token);
        showAdminDashboard();
        adminSetCurrentDate();
        adminLoadAllData();
        showToast("Welcome to the Admin Dashboard.");

    } catch (error) {
        errorEl.textContent = error.message || "Login failed. Please try again.";
        errorEl.classList.remove("hidden");
    } finally {
        loginBtn.disabled = false;
        btnText.classList.remove("hidden");
        btnLoading.classList.add("hidden");
    }
});


/* =====================================================
   ADMIN PORTAL - LOGOUT
===================================================== */

function adminLogout() {
    clearAdminToken();
    showAdminLogin();
    document.getElementById("adminUsername").value = "";
    document.getElementById("adminPassword").value = "";
    document.getElementById("adminLoginError").classList.add("hidden");
    showToast("Logged out successfully.");
}


/* =====================================================
   INITIAL LOAD
===================================================== */

adminSetCurrentDate();
setInterval(() => {
    if (
        document.getElementById("adminPortal").classList.contains("active-portal") &&
        getAdminToken()
    ) {
        verifyAdminToken().then(valid => {
            if (valid) {
                adminLoadAllData();
            } else {
                clearAdminToken();
                showAdminLogin();
            }
        });
    }
}, 15000);
