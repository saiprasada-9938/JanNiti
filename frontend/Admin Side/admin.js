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
    const headers = {
        "Content-Type": "application/json"
    };
    if (token) {
        headers["Authorization"] = "Bearer " + token;
    }
    return headers;
}

async function verifyAdminToken() {
    const token = getAdminToken();
    if (!token) return false;
    try {
        const response = await fetch(
            API_BASE_URL + "/api/auth/verify?token=" + encodeURIComponent(token)
        );
        return response.ok;
    } catch (error) {
        return false;
    }
}

function showAdminLoginScreen() {
    document.getElementById("adminLoginScreen").style.display = "flex";
    document.getElementById("adminLogoutBtn").style.display = "none";
}

function showAdminMain() {
    document.getElementById("adminLoginScreen").style.display = "none";
    document.getElementById("adminLogoutBtn").style.display = "inline-block";
}

function adminHandleUnauthorized() {
    clearAdminToken();
    showAdminLoginScreen();
    showToast("Session expired. Please log in again.");
}

function adminLogout() {
    clearAdminToken();
    showAdminLoginScreen();
    document.getElementById("adminUsername").value = "";
    document.getElementById("adminPassword").value = "";
    document.getElementById("adminLoginError").style.display = "none";
    showToast("Logged out successfully.");
}

/* =====================================================
   JAN NITI ADMIN PORTAL
   MAIN JAVASCRIPT
===================================================== */


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let selectedComplaintId = null;
let complaintsCache = [];
let priorityCache = [];

/* Keep AI output useful for a busy administrator instead of showing raw JSON. */
function parsePhotoAnalysis(value) {
    if (!value) return {};
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch (error) {
        return { description: String(value) };
    }
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
}

function makeReadableSummary(value, fallback) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return fallback;
    return text.length > 240 ? `${text.slice(0, 237).trimEnd()}…` : text;
}

function renderPhotoEvidence(complaint) {
    if (!complaint.photo_filename) return "";

    const analysis = parsePhotoAnalysis(complaint.photo_analysis);
    const isPending = ["Pending", "Processing"].includes(complaint.ai_status);
    const issue = analysis.issue_type || (isPending ? "Photo analysis in progress" : "Uploaded civic issue");
    const evidence = makeReadableSummary(analysis.visible_evidence || analysis.description,
        isPending ? "The photo is saved and AI analysis will appear shortly."
            : "The uploaded photo is available for administrative review.");
    const imageUrl = `${API_BASE_URL}/uploads/${encodeURIComponent(complaint.photo_filename)}`;

    return `
        <section class="photo-evidence">
            <div class="photo-evidence__image-wrap">
                <img class="photo-evidence__image" src="${imageUrl}"
                    alt="Evidence photo for complaint CMP-${escapeHtml(complaint.id)}">
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
   GET COMPLAINTS FROM BACKEND
===================================================== */

function getComplaints() {
    return complaintsCache;
}


/* =====================================================
   SAVE COMPLAINTS TO BACKEND
===================================================== */

async function updateComplaintStatusAPI(
    complaintId,
    newStatus
) {

    const response = await fetch(
        `${API_BASE_URL}/api/submissions/${complaintId}/status`,
        {
            method: "PATCH",

            headers: adminAuthHeaders(),

            body: JSON.stringify({
                status: newStatus
            })
        }
    );

    if (response.status === 401) {
        adminHandleUnauthorized();
        return;
    }

    if (!response.ok) {
        const errorData = await response.json();

        console.error(
            "Status update error:",
            errorData
        );

        throw new Error(
            "Failed to update complaint status"
        );
    }

    return await response.json();
}


/* =====================================================
   NAVIGATION
===================================================== */

const navButtons =
    document.querySelectorAll(".nav-button");


const pageSections =
    document.querySelectorAll(".page-section");


const pageTitle =
    document.getElementById("pageTitle");


const pageTitles = {

    dashboard:
        "Development Dashboard",

    complaints:
        "Complaint Management",

    analysis:
        "Complaint Analysis",

    priority:
        "Priority Issues"

};


/* =====================================================
   SHOW PAGE FUNCTION
===================================================== */

function showPage(sectionName) {


    /* Hide all pages */

    pageSections.forEach(
        section => {

            section.classList.remove(
                "active-section"
            );

        }
    );


    /* Show selected page */

    const selectedSection =
        document.getElementById(
            sectionName
        );


    if (selectedSection) {

        selectedSection.classList.add(
            "active-section"
        );

    }


    /* Change page title */

    pageTitle.textContent =
        pageTitles[sectionName] ||
        "Government Administration";


    /* Change active sidebar button */

    navButtons.forEach(
        button => {

            button.classList.remove(
                "active"
            );


            if (
                button.dataset.section ===
                sectionName
            ) {

                button.classList.add(
                    "active"
                );

            }

        }
    );


    /* Refresh data */

    loadAllData();


    /* Scroll to top */

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });


    /* Close mobile menu */

    document
        .getElementById("sidebar")
        .classList.remove("open");

}


/* =====================================================
   SIDEBAR BUTTON EVENTS
===================================================== */

navButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            function() {

                const section =
                    this.dataset.section;


                showPage(section);

            }
        );

    }
);


/* =====================================================
   DASHBOARD INTERNAL BUTTONS
===================================================== */

const sectionButtons =
    document.querySelectorAll(
        "[data-section-target]"
    );


sectionButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            function() {

                const section =
                    this.dataset.sectionTarget;


                showPage(section);

            }
        );

    }
);


/* =====================================================
   MOBILE MENU
===================================================== */

document
    .getElementById("menuButton")
    .addEventListener(
        "click",
        function() {

            document
                .getElementById("sidebar")
                .classList.toggle("open");

        }
    );


/* =====================================================
   CURRENT DATE
===================================================== */

function setCurrentDate() {

    const dateElement =
        document.getElementById(
            "currentDate"
        );


    const today =
        new Date();


    dateElement.textContent =
        today.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );

}


setCurrentDate();


/* =====================================================
   PRIORITY SCORE
===================================================== */

function calculatePriority(complaint) {

    const category =
        complaint.ai_category ||
        complaint.ml_category ||
        complaint.category ||
        "Other";

    const normalizedCategory =
        category.trim().toLowerCase();

    const priorityData =
        priorityCache.find(item => {

            return (
                item.category &&
                item.category.trim().toLowerCase() ===
                normalizedCategory
            );

        });

    if (priorityData) {

        return Number(
            priorityData.final_priority_score || 0
        );

    }

    return 0;
}

/* =====================================================
   PRIORITY CLASS
===================================================== */

function getPriorityClass(
    score
) {

    if (score >= 80) {

        return "priority-high";

    }


    if (score >= 60) {

        return "priority-medium";

    }


    return "priority-low";

}


/* =====================================================
   SEVERITY CLASS
===================================================== */

function getSeverityClass(
    severity
) {

    if (
        severity ===
        "High"
    ) {

        return "severity-high";

    }


    if (
        severity ===
        "Medium"
    ) {

        return "severity-medium";

    }


    return "severity-low";

}


/* =====================================================
   STATUS CLASS
===================================================== */

function getStatusClass(
    status
) {

    if (
        status ===
        "Under Review"
    ) {

        return "status-review";

    }


    if (
        status ===
        "Action Planned"
    ) {

        return "status-action";

    }


    if (
        status ===
        "Resolved"
    ) {

        return "status-resolved";

    }


    return "status-submitted";

}

/* =====================================================
   LOAD AI PRIORITY SCORES FROM FASTAPI
===================================================== */

async function loadPriorityScores() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/api/submissions/priorities`,
            {
                headers: adminAuthHeaders()
            }
        );

        if (response.status === 401) {
            adminHandleUnauthorized();
            return;
        }

        if (!response.ok) {

            throw new Error(
                "Failed to load priority scores"
            );

        }

        const responseData =
            await response.json();

        priorityCache =
            Array.isArray(responseData)
                ? responseData
                : (
                    responseData.data ||
                    responseData.results ||
                    []
                );

        console.log(
            "AI Priority Scores:",
            priorityCache
        );

    } catch (error) {

        console.error(
            "Priority API error:",
            error
        );

        priorityCache = [];

    }

}

/* =====================================================
   LOAD EVERYTHING FROM FASTAPI
===================================================== */

async function loadAllData() {

    try {

        console.log(
            "Loading complaints from FastAPI..."
        );

        const response = await fetch(
            `${API_BASE_URL}/api/submissions/`,
            {
                headers: adminAuthHeaders()
            }
        );

        if (response.status === 401) {
            adminHandleUnauthorized();
            return;
        }

        if (!response.ok) {
            throw new Error(
                "Failed to load complaints"
            );
        }

        const responseData =
            await response.json();

        console.log(
            "Backend complaints:",
            responseData
        );

        /*
           Support both:
           [ complaint, complaint ]
           and
           { data: [ complaint, complaint ] }
        */

        complaintsCache =
            Array.isArray(responseData)
                ? responseData
                : (
                    responseData.data ||
                    responseData.results ||
                    []
                );

        /*
           Make sure every complaint has
           a status for the admin UI.
        */

        complaintsCache = complaintsCache.map(complaint => {
            const photoAnalysis = parsePhotoAnalysis(complaint.photo_analysis);

            return {
                ...complaint,
                status: complaint.status || "Submitted",
                // One source of truth: use the photo AI assessment when available.
                severity: complaint.severity || photoAnalysis.severity || "Not assessed",
                ai_status: complaint.ai_status || "Complete",
                location: complaint.village || complaint.district || "Not specified"
            };
        });

        console.log(
            "Complaints loaded:",
            complaintsCache
        );
        await loadPriorityScores();

        /* Update dashboard */

        updateStatistics(
            complaintsCache
        );

        renderDashboardTable(
            complaintsCache
        );

        renderComplaintsTable(
            complaintsCache
        );

        renderPriorityList(
            complaintsCache
        );

        renderCategoryList(
            complaintsCache
        );

        renderAnalysis(
            complaintsCache
        );

        renderPriorityTable(
            complaintsCache
        );


    } catch (error) {

        console.error(
            "Backend loading error:",
            error
        );

        complaintsCache = [];

        updateStatistics(
            complaintsCache
        );

        renderDashboardTable(
            complaintsCache
        );

        renderComplaintsTable(
            complaintsCache
        );

        renderPriorityList(
            complaintsCache
        );

        renderCategoryList(
            complaintsCache
        );

        renderAnalysis(
            complaintsCache
        );

        renderPriorityTable(
            complaintsCache
        );

        showToast(
            "Cannot connect to CivicAI backend."
        );
    }
}

/* =====================================================
   STATISTICS
===================================================== */

function updateStatistics(
    complaints
) {

    const total =
        complaints.length;


    const pending =
        complaints.filter(
            complaint =>
                complaint.status ===
                "Submitted"
        ).length;


    const review =
        complaints.filter(
            complaint =>
                complaint.status ===
                "Under Review"
        ).length;


    const resolved =
        complaints.filter(
            complaint =>
                complaint.status ===
                "Resolved"
        ).length;


    document.getElementById(
        "totalComplaints"
    ).textContent =
        total;


    document.getElementById(
        "pendingComplaints"
    ).textContent =
        pending;


    document.getElementById(
        "reviewComplaints"
    ).textContent =
        review;


    document.getElementById(
        "resolvedComplaints"
    ).textContent =
        resolved;


    document.getElementById(
        "notificationCount"
    ).textContent =
        pending;

}


/* =====================================================
   DASHBOARD TABLE
===================================================== */

function renderDashboardTable(
    complaints
) {

    const table =
        document.getElementById(
            "dashboardTable"
        );


    if (
        complaints.length === 0
    ) {

        table.innerHTML = `
        
            <tr>
            
                <td
                    colspan="7"
                    style="
                        text-align:center;
                        padding:35px;
                        color:#71808A;
                    "
                >
                
                    No complaints submitted yet.
                
                </td>
            
            </tr>
        
        `;

        return;

    }


    const recent =
        [...complaints]
            .reverse()
            .slice(0, 6);


    table.innerHTML =
        recent.map(
            complaint =>
                createTableRow(
                    complaint,
                    false
                )
        ).join("");

}


/* =====================================================
   COMPLAINT TABLE
===================================================== */

function renderComplaintsTable(
    complaints
) {

    const table =
        document.getElementById(
            "complaintsTable"
        );


    const search =
        document
            .getElementById(
                "searchInput"
            )
            .value
            .toLowerCase();


    const status =
        document
            .getElementById(
                "statusFilter"
            )
            .value;


    const severity =
        document
            .getElementById(
                "severityFilter"
            )
            .value;


    const filtered =
        complaints.filter(
            complaint => {

                const text =
                    `
                    ${complaint.id}
                    ${complaint.category}
                    ${complaint.village}
                    ${complaint.district}
                    ${complaint.name}
                    `
                    .toLowerCase();


                const searchMatch =
                    text.includes(
                        search
                    );


                const statusMatch =
                    status === "All" ||
                    complaint.status ===
                    status;


                const severityMatch =
                    severity === "All" ||
                    complaint.severity ===
                    severity;


                return (
                    searchMatch &&
                    statusMatch &&
                    severityMatch
                );

            }
        );


    if (
        filtered.length === 0
    ) {

        table.innerHTML = `
        
            <tr>
            
                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:40px;
                        color:#71808A;
                    "
                >
                
                    No matching complaints found.
                
                </td>
            
            </tr>
        
        `;

        return;

    }


    table.innerHTML =
        filtered
            .slice()
            .reverse()
            .map(
                complaint =>
                    createTableRow(
                        complaint,
                        true
                    )
            )
            .join("");

}


/* =====================================================
   CREATE TABLE ROW
===================================================== */

function createTableRow(
    complaint,
    detailed
) {

    const priority =
        calculatePriority(
            complaint
        );


    const severityClass =
        getSeverityClass(
            complaint.severity
        );


    const statusClass =
        getStatusClass(
            complaint.status
        );


    return `

        <tr>

            <td>

                <span class="complaint-id">
                    CMP-${complaint.id}
                </span>

            </td>


            <td>

                <strong>
                    ${complaint.category || "General"}
                </strong>

            </td>


            ${
                detailed

                ?

                `
                <td>
                    ${complaint.name || "Citizen"}
                </td>
                `

                :

                ""
            }


            <td>

                ${
                    complaint.village ||
                    complaint.district ||
                    complaint.location ||
                    "Not specified"
                }

            </td>


            ${
                !detailed

                ?

                ""

                :

                ""
            }


            <td>

                <span class="${severityClass}">
                    ${complaint.severity || "Low"}
                </span>

            </td>


            <td>

                <span
                    class="status-badge ${statusClass}"
                >

                    ${complaint.status || "Submitted"}

                </span>

            </td>


            <td>

                <span
                    class="${getPriorityClass(
                        priority
                    )}"
                >

                    ${priority}

                </span>

            </td>


            <td>

                <button
                    class="view-button"
                    onclick="
                        openComplaint(
                            '${complaint.id}'
                        )
                    "
                >

                    View

                </button>

            </td>

        </tr>

    `;

}


/* =====================================================
   AI PRIORITY LIST
===================================================== */

function renderPriorityList(complaints) {

    const container =
        document.getElementById(
            "dashboardPriorityList"
        );

    if (!priorityCache.length) {

        container.innerHTML = `

            <p
                style="
                    color:#71808A;
                    font-size:10px;
                    padding:15px 0;
                "
            >
                AI priority analysis will appear
                after complaints are submitted.
            </p>

        `;

        return;

    }

    const sorted =
        [...priorityCache]
            .sort(
                (a, b) =>
                    Number(b.final_priority_score || 0) -
                    Number(a.final_priority_score || 0)
            )
            .slice(0, 5);


    container.innerHTML =
        sorted.map((item, index) => {

            const score =
                Number(
                    item.final_priority_score || 0
                );

            return `

                <div class="priority-item">

                    <div class="rank-circle">

                        ${String(
                            index + 1
                        ).padStart(2, "0")}

                    </div>


                    <div class="priority-info">

                        <strong>
                            ${item.category}
                        </strong>

                        <small>
                            ${item.total_complaints}
                            complaint(s)
                        </small>

                    </div>


                    <div class="priority-score">

                        <strong>
                            ${score.toFixed(2)}
                        </strong>

                        <small>
                            Priority
                        </small>

                    </div>

                </div>

            `;

        })
        .join("");

}
/* =====================================================
   CATEGORY LIST
===================================================== */

function renderCategoryList(
    complaints
) {

    const container =
        document.getElementById(
            "dashboardCategoryList"
        );


    if (
        complaints.length === 0
    ) {

        container.innerHTML = `

            <p
                style="
                    color:#71808A;
                    font-size:10px;
                    padding:15px 0;
                "
            >
                No category data available.
            </p>

        `;

        return;

    }


    const categories =
        getCategoryCounts(
            complaints
        );


    const max =
        Math.max(
            ...Object.values(
                categories
            )
        );


    container.innerHTML =
        Object.entries(
            categories
        )
        .map(
            ([category, count]) => {

                const width =
                    Math.round(
                        (count / max) * 100
                    );


                return `

                    <div class="category-item">

                        <div
                            class="category-heading"
                        >

                            <span>
                                ${category}
                            </span>

                            <strong>
                                ${count}
                            </strong>

                        </div>


                        <div class="progress">

                            <div
                                class="progress-bar"
                                style="
                                    width:${width}%;
                                "
                            ></div>

                        </div>

                    </div>

                `;

            }
        )
        .join("");

}


/* =====================================================
   CATEGORY COUNTS
===================================================== */

function getCategoryCounts(
    complaints
) {

    const categories = {};


    complaints.forEach(
        complaint => {

            const category =
                complaint.category ||
                "General";


            categories[category] =
                (
                    categories[category] ||
                    0
                ) + 1;

        }
    );


    return Object.fromEntries(

        Object.entries(
            categories
        ).sort(
            ([, a], [, b]) =>
                b - a
        )

    );

}


/* =====================================================
   ANALYSIS
===================================================== */

function renderAnalysis(
    complaints
) {

    renderAnalysisCategories(
        complaints
    );


    renderStatusAnalysis(
        complaints
    );


    renderSummary(
        complaints
    );

}


/* =====================================================
   ANALYSIS CATEGORY
===================================================== */

function renderAnalysisCategories(
    complaints
) {

    const container =
        document.getElementById(
            "analysisCategoryList"
        );


    const categories =
        getCategoryCounts(
            complaints
        );


    if (
        Object.keys(
            categories
        ).length === 0
    ) {

        container.innerHTML = `
        
            <p
                style="
                    color:#71808A;
                    font-size:10px;
                "
            >
                No data available.
            </p>
        
        `;

        return;

    }


    const total =
        complaints.length;


    container.innerHTML =
        Object.entries(
            categories
        )
        .map(
            ([category, count]) => {

                const percentage =
                    Math.round(
                        (
                            count /
                            total
                        ) * 100
                    );


                return `

                    <div class="category-item">

                        <div
                            class="category-heading"
                        >

                            <span>
                                ${category}
                            </span>

                            <strong>
                                ${count}
                                (${percentage}%)
                            </strong>

                        </div>


                        <div class="progress">

                            <div
                                class="progress-bar"
                                style="
                                    width:${percentage}%;
                                "
                            ></div>

                        </div>

                    </div>

                `;

            }
        )
        .join("");

}


/* =====================================================
   STATUS ANALYSIS
===================================================== */

function renderStatusAnalysis(
    complaints
) {

    const container =
        document.getElementById(
            "statusAnalysis"
        );


    const statuses = {

        "Submitted": 0,

        "Under Review": 0,

        "Action Planned": 0,

        "Resolved": 0

    };


    complaints.forEach(
        complaint => {

            if (
                statuses[
                    complaint.status
                ] !== undefined
            ) {

                statuses[
                    complaint.status
                ]++;

            }

        }
    );


    const total =
        complaints.length || 1;


    container.innerHTML =
        Object.entries(
            statuses
        )
        .map(
            ([status, count]) => {

                const percentage =
                    Math.round(
                        (
                            count /
                            total
                        ) * 100
                    );


                return `

                    <div class="category-item">

                        <div
                            class="category-heading"
                        >

                            <span>
                                ${status}
                            </span>

                            <strong>
                                ${count}
                            </strong>

                        </div>


                        <div class="progress">

                            <div
                                class="progress-bar"
                                style="
                                    width:${percentage}%;
                                "
                            ></div>

                        </div>

                    </div>

                `;

            }
        )
        .join("");

}


/* =====================================================
   SUMMARY
===================================================== */

function renderSummary(
    complaints
) {

    const container =
        document.getElementById(
            "summaryGrid"
        );


    const high =
        complaints.filter(
            complaint =>
                complaint.severity ===
                "High"
        ).length;


    const medium =
        complaints.filter(
            complaint =>
                complaint.severity ===
                "Medium"
        ).length;


    const low =
        complaints.filter(
            complaint =>
                complaint.severity ===
                "Low"
        ).length;


    const resolved =
        complaints.filter(
            complaint =>
                complaint.status ===
                "Resolved"
        ).length;


    container.innerHTML = `

        <div class="summary-box">

            <span>
                High Severity
            </span>

            <strong>
                ${high}
            </strong>

        </div>


        <div class="summary-box">

            <span>
                Medium Severity
            </span>

            <strong>
                ${medium}
            </strong>

        </div>


        <div class="summary-box">

            <span>
                Low Severity
            </span>

            <strong>
                ${low}
            </strong>

        </div>


        <div class="summary-box">

            <span>
                Resolved
            </span>

            <strong>
                ${resolved}
            </strong>

        </div>

    `;

}


/* =====================================================
   AI PRIORITY TABLE
===================================================== */

function renderPriorityTable(complaints) {

    const table =
        document.getElementById(
            "priorityTable"
        );

    if (!priorityCache.length) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:40px;
                        color:#71808A;
                    "
                >

                    No AI priority analysis available.

                </td>

            </tr>

        `;

        return;

    }


    const sorted =
        [...priorityCache]
            .sort(
                (a, b) =>
                    Number(b.final_priority_score || 0) -
                    Number(a.final_priority_score || 0)
            );


    table.innerHTML =
        sorted.map((item, index) => {

            const score =
                Number(
                    item.final_priority_score || 0
                );

            const breakdown =
                item.priority_breakdown || {};


            return `

                <tr>

                    <td>

                        <strong>
                            #${index + 1}
                        </strong>

                    </td>


                    <td>

                        <strong>
                            ${item.category}
                        </strong>

                    </td>


                    <td>

                        ${item.total_complaints}

                    </td>


                    <td>

                        ${breakdown.citizen_demand ?? 0}/30

                    </td>


                    <td>

                        ${breakdown.severity ?? 0}/25

                    </td>


                    <td>

                        ${breakdown.hotspot_concentration ?? 0}/20

                    </td>


                    <td>

                        <span
                            class="${getPriorityClass(score)}"
                        >

                            ${score.toFixed(2)}

                        </span>

                    </td>


                    <td>

                        <span
                            class="${getPriorityClass(score)}"
                        >

                            ${
                                score >= 70
                                    ? "HIGH"
                                    : score >= 40
                                        ? "MEDIUM"
                                        : "LOW"
                            }

                        </span>

                    </td>

                </tr>

            `;

        })
        .join("");

}
/* =====================================================
   GET CATEGORY PRIORITY DETAILS
===================================================== */

function getComplaintPriorityData(complaint) {

    const category =
        complaint.ai_category ||
        complaint.ml_category ||
        complaint.category ||
        "Other";

    return priorityCache.find(item =>
        item.category &&
        item.category.trim().toLowerCase() ===
        category.trim().toLowerCase()
    );

}

/* =====================================================
   MAP-BASED IMPACT ANALYSIS
===================================================== */

function calculateImpactAnalysis(complaint) {

    const category =
        (
            complaint.ai_category ||
            complaint.ml_category ||
            complaint.category ||
            "Other"
        )
        .trim()
        .toLowerCase();


    const priority =
        Number(calculatePriority(complaint) || 0);


    const severity =
        complaint.severity || "Medium";


    /*
       Base impact radius in KM
       depending on the type of civic problem.
    */

    const categoryImpact = {

        road: {
            radius: 2,
            baseAffected: 1200,
            benefitRate: 0.90
        },

        water: {
            radius: 3,
            baseAffected: 1800,
            benefitRate: 0.95
        },

        education: {
            radius: 2.5,
            baseAffected: 1500,
            benefitRate: 0.85
        },

        health: {
            radius: 4,
            baseAffected: 2200,
            benefitRate: 0.92
        },

        electricity: {
            radius: 2,
            baseAffected: 1400,
            benefitRate: 0.90
        },

        sanitation: {
            radius: 1.5,
            baseAffected: 1000,
            benefitRate: 0.88
        },

        other: {
            radius: 1,
            baseAffected: 700,
            benefitRate: 0.80
        }
    };


    const impact =
        categoryImpact[category] ||
        categoryImpact.other;


    /*
       Severity multiplier
    */

    const severityMultiplier = {

        High: 1.5,

        Medium: 1.0,

        Low: 0.6
    };


    const multiplier =
        severityMultiplier[severity] || 1.0;


    /*
       Priority increases estimated impact.
    */

    const priorityMultiplier =
        1 + (priority / 200);


    /*
       Final estimated people affected.
    */

    const affected =
        Math.round(
            impact.baseAffected *
            multiplier *
            priorityMultiplier
        );


    /*
       Estimated beneficiaries.
    */

    const beneficiaries =
        Math.round(
            affected *
            impact.benefitRate
        );


    /*
       Social impact score: 0–100
    */

    const socialImpactScore =
        Math.min(
            100,

            Math.round(
                (
                    priority * 0.6
                ) +

                (
                    severity === "High"
                        ? 30
                        : severity === "Medium"
                            ? 20
                            : 10
                )
            )
        );


    let impactLevel = "Low";


    if (socialImpactScore >= 70) {

        impactLevel = "High";

    } else if (socialImpactScore >= 40) {

        impactLevel = "Medium";

    }


    return {

        impactRadius:
            impact.radius,

        estimatedAffected:
            affected,

        estimatedBeneficiaries:
            beneficiaries,

        socialImpactScore:
            socialImpactScore,

        impactLevel:
            impactLevel

    };

}

/* =====================================================
   OPEN COMPLAINT MODAL
===================================================== */

function openComplaint(complaintId) {

    const complaints = getComplaints();

    const complaint = complaints.find(
        item =>
            String(item.id) ===
            String(complaintId)
    );

    if (!complaint) {

        showToast(
            "Complaint not found."
        );

        return;
    }

    selectedComplaintId = complaintId;


    /* =================================================
       BASIC COMPLAINT INFORMATION
    ================================================= */

    document.getElementById(
        "modalTitle"
    ).textContent =
        complaint.category ||
        "Complaint";


    document.getElementById(
        "modalId"
    ).textContent =
        `Complaint ID: CMP-${complaint.id}`;


    document.getElementById(
        "modalDescription"
    ).textContent =
        complaint.description ||
        "No description provided.";


    document.getElementById(
        "modalStatus"
    ).value =
        complaint.status ||
        "Submitted";


    /* =================================================
       PRIORITY
    ================================================= */

    const priority =
        calculatePriority(
            complaint
        );

    const priorityData =
    getComplaintPriorityData(
        complaint
    );

    const impactData =
    calculateImpactAnalysis(
        complaint
    );


    /* =================================================
       MODAL DETAILS
    ================================================= */

    document.getElementById(
        "modalDetails"
    ).innerHTML = `

        <!-- CITIZEN INFORMATION -->

        <div class="detail-box">
            <span>Citizen Name</span>
            <strong>
                ${complaint.name || "Not provided"}
            </strong>
        </div>


        <div class="detail-box">
            <span>Mobile Number</span>
            <strong>
                ${complaint.phone || "Not provided"}
            </strong>
        </div>


        <!-- COMPLAINT INFORMATION -->

        <div class="detail-box">
            <span>Category</span>
            <strong>
                ${complaint.category || "General"}
            </strong>
        </div>


        <div class="detail-box">
            <span>Severity</span>
            <strong>
                ${complaint.severity || "Medium"}
            </strong>
        </div>


        <div class="detail-box">
            <span>Village</span>
            <strong>
                ${complaint.village || "Not provided"}
            </strong>
        </div>


        <div class="detail-box">
            <span>District</span>
            <strong>
                ${complaint.district || "Not provided"}
            </strong>
        </div>


        <div class="detail-box">
            <span>Ward</span>
            <strong>
                ${complaint.ward || "Not provided"}
            </strong>
        </div>


        <div class="detail-box">
            <span>Language</span>
            <strong>
                ${complaint.language || "Not provided"}
            </strong>
        </div>


        <!-- GPS -->

        <div class="detail-box">
            <span>GPS Latitude</span>
            <strong>
                ${
                    complaint.latitude !== null &&
                    complaint.latitude !== undefined
                        ? complaint.latitude
                        : "Not available"
                }
            </strong>
        </div>


        <div class="detail-box">
            <span>GPS Longitude</span>
            <strong>
                ${
                    complaint.longitude !== null &&
                    complaint.longitude !== undefined
                        ? complaint.longitude
                        : "Not available"
                }
            </strong>
        </div>


        <!-- DATE -->

        <div class="detail-box">
            <span>Submitted Date</span>
            <strong>
                ${
                    complaint.created_at
                        ? new Date(
                            complaint.created_at
                        ).toLocaleString("en-IN")
                        : "Not provided"
                }
            </strong>
        </div>

        ${renderPhotoEvidence(complaint)}


        <!-- PRIORITY -->

        <div class="detail-box">
            <span>Priority Score</span>
            <strong>
                ${priority}
            </strong>
        </div>
        ${
    priorityData
        ? `

            <div
                class="detail-box"
                style="
                    grid-column: 1 / -1;
                    margin-top: 10px;
                "
            >

                <span>
                    🤖 AI PRIORITY BREAKDOWN
                </span>

                <strong>
                    ${priorityData.explanation}
                </strong>

            </div>


            <div class="detail-box">

                <span>
                    Citizen Demand
                </span>

                <strong>
                    ${priorityData.priority_breakdown.citizen_demand}
                    / 30
                </strong>

            </div>


            <div class="detail-box">

                <span>
                    Urgency contribution
                </span>

                <strong>
                    ${priorityData.priority_breakdown.severity}
                    / 25
                </strong>

            </div>


            <div class="detail-box">

                <span>
                    Hotspot Concentration
                </span>

                <strong>
                    ${priorityData.priority_breakdown.hotspot_concentration}
                    / 20
                </strong>

            </div>


            <div class="detail-box">

                <span>
                    ML Confidence
                </span>

                <strong>
                    ${priorityData.priority_breakdown.ml_confidence}
                    / 10
                </strong>

            </div>


            <div class="detail-box">

                <span>
                    Active Demand
                </span>

                <strong>
                    ${priorityData.priority_breakdown.active_demand}
                    / 15
                </strong>

            </div>

        `
        : ""
    }
            <!-- =========================================
             MAP-BASED IMPACT ANALYSIS
        ========================================== -->

        <div
            class="detail-box"
            style="
                grid-column: 1 / -1;
                margin-top: 15px;
            "
        >

            <span>
                📊 MAP-BASED IMPACT ANALYSIS
            </span>

            <strong>
                CivicAI Impact Estimation
            </strong>

        </div>


        <div class="detail-box">

            <span>
                👥 Estimated People Affected
            </span>

            <strong>
                ${impactData.estimatedAffected.toLocaleString("en-IN")}
                People
            </strong>

        </div>


        <div class="detail-box">

            <span>
                ✅ Estimated Beneficiaries
            </span>

            <strong>
                ${impactData.estimatedBeneficiaries.toLocaleString("en-IN")}
                People
            </strong>

        </div>


        <div class="detail-box">

            <span>
                ⭕ Impact Radius
            </span>

            <strong>
                ${impactData.impactRadius} KM
            </strong>

        </div>


        <div class="detail-box">

            <span>
                📈 Social Impact Score
            </span>

            <strong>
                ${impactData.socialImpactScore}/100
                (${impactData.impactLevel})
            </strong>

        </div>


        <!-- GOOGLE MAPS -->

        ${
            complaint.latitude !== null &&
            complaint.latitude !== undefined &&
            complaint.longitude !== null &&
            complaint.longitude !== undefined
                ? `
                    <div class="detail-box">
                        <span>GPS Location</span>

                        <strong>

                            <a
                                href="https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                📍 Open in Google Maps
                            </a>

                        </strong>

                    </div>
                `
                : ""
        }


        <!-- =========================================
             AI ANALYSIS
        ========================================== -->

        <div
            class="detail-box"
            style="
                grid-column: 1 / -1;
                margin-top: 15px;
            "
        >

            <span>
                🤖 AI ANALYSIS
            </span>

            <strong>
                CivicAI Intelligence
            </strong>

        </div>


        <div class="detail-box">

            <span>
                AI Analysis Status
            </span>

            <strong>
                ${complaint.ai_status || "Complete"}
            </strong>

        </div>


        <div class="detail-box">

            <span>
                AI Category
            </span>

            <strong>
                ${
                    complaint.ai_category ||
                    "Not analyzed"
                }
            </strong>

        </div>


        <div class="detail-box">

            <span>
                Recommended Department
            </span>

            <strong>
                ${
                    complaint.ai_department ||
                    "Not determined"
                }
            </strong>

        </div>


        <div
            class="detail-box"
            style="
                grid-column: 1 / -1;
            "
        >

            <span>
                AI Summary
            </span>

            <strong>
                ${
                    makeReadableSummary(
                        complaint.ai_summary,
                        "No AI summary is available for this complaint."
                    )
                }
            </strong>

        </div>


        <div
            class="detail-box"
            style="
                grid-column: 1 / -1;
            "
        >

            <span>
                AI Keywords
            </span>

            <strong>
                ${
                    complaint.ai_keywords ||
                    "No keywords available."
                }
            </strong>

        </div>

    `;


    /* =================================================
       SHOW MODAL
    ================================================= */

    document
        .getElementById("modalOverlay")
        .classList.remove("hidden");
}
/* =====================================================
   CLOSE MODAL
===================================================== */

document
    .getElementById(
        "closeModal"
    )
    .addEventListener(
        "click",
        closeModal
    );


function closeModal() {

    document
        .getElementById(
            "modalOverlay"
        )
        .classList.add(
            "hidden"
        );


    selectedComplaintId =
        null;

}


/* =====================================================
   CLICK OUTSIDE MODAL
===================================================== */

document
    .getElementById(
        "modalOverlay"
    )
    .addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                this
            ) {

                closeModal();

            }

        }
    );


/* =====================================================
   UPDATE STATUS - BACKEND API
===================================================== */

document
    .getElementById("updateStatusButton")
    .addEventListener(
        "click",
        async function() {

            if (!selectedComplaintId) {
                return;
            }

            const newStatus =
                document
                    .getElementById(
                        "modalStatus"
                    )
                    .value;

            try {

                console.log(
                    "Updating complaint:",
                    selectedComplaintId,
                    "→",
                    newStatus
                );


                await updateComplaintStatusAPI(
                    selectedComplaintId,
                    newStatus
                );


                /*
                   Reload fresh data from
                   SQLite through FastAPI.
                */

                await loadAllData();


                closeModal();


                showToast(
                    "Complaint status updated successfully."
                );


            } catch (error) {

                console.error(
                    "Status update failed:",
                    error
                );

                showToast(
                    "Failed to update complaint status."
                );
            }

        }
    );

/* =====================================================
   SEARCH
===================================================== */

document
    .getElementById(
        "searchInput"
    )
    .addEventListener(
        "input",
        function() {

            renderComplaintsTable(
                getComplaints()
            );

        }
    );


/* =====================================================
   STATUS FILTER
===================================================== */

document
    .getElementById(
        "statusFilter"
    )
    .addEventListener(
        "change",
        function() {

            renderComplaintsTable(
                getComplaints()
            );

        }
    );


/* =====================================================
   SEVERITY FILTER
===================================================== */

document
    .getElementById(
        "severityFilter"
    )
    .addEventListener(
        "change",
        function() {

            renderComplaintsTable(
                getComplaints()
            );

        }
    );


/* =====================================================
   REFRESH BUTTON
===================================================== */

document
    .getElementById(
        "refreshButton"
    )
    .addEventListener(
        "click",
        function() {

            loadAllData();


            showToast(
                "Dashboard data refreshed."
            );

        }
    );


/* =====================================================
   TOAST
===================================================== */

function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(
        function() {

            toast.classList.remove(
                "show"
            );

        },
        2500
    );

}


/* =====================================================
   LOGIN FORM
===================================================== */

document
    .getElementById(
        "adminLoginForm"
    )
    .addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const username =
                document
                    .getElementById(
                        "adminUsername"
                    )
                    .value
                    .trim();

            const password =
                document
                    .getElementById(
                        "adminPassword"
                    )
                    .value;

            const errorEl =
                document.getElementById(
                    "adminLoginError"
                );

            const loginBtn =
                document.getElementById(
                    "adminLoginBtn"
                );

            errorEl.style.display = "none";
            loginBtn.disabled = true;

            try {

                const response =
                    await fetch(
                        `${API_BASE_URL}/api/auth/login`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                username: username,
                                password: password
                            })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.detail || "Invalid credentials"
                    );
                }

                setAdminToken(
                    data.access_token
                );

                showAdminMain();

                loadAllData();

                showToast(
                    "Welcome to the Admin Dashboard."
                );

            } catch (error) {

                errorEl.textContent =
                    error.message ||
                    "Login failed. Please try again.";

                errorEl.style.display = "block";

            } finally {

                loginBtn.disabled = false;

            }

        }
    );


/* =====================================================
   LOGOUT BUTTON
===================================================== */

document
    .getElementById(
        "adminLogoutBtn"
    )
    .addEventListener(
        "click",
        adminLogout
    );


/* =====================================================
   INITIAL LOAD
===================================================== */

async function initAdmin() {
    const valid = await verifyAdminToken();
    if (valid) {
        showAdminMain();
        loadAllData();
    } else {
        showAdminLoginScreen();
    }
}

initAdmin();

// Background AI updates are reflected automatically without interrupting admins.
setInterval(function() {
    if (getAdminToken()) {
        loadAllData();
    }
}, 15000);
