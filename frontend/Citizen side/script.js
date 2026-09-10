/* =========================================
   JAN NITI - CITIZEN PORTAL
   JavaScript
========================================= */

const API_BASE_URL = window.CIVICAI_API_URL || "https://janniti.antideploy.com";


/* =========================================
   MOBILE MENU
========================================= */

const mobileMenu = document.getElementById("mobileMenu");
const navbar = document.querySelector(".navbar");

mobileMenu.addEventListener("click", () => {

    navbar.classList.toggle("show");

});


/* Close mobile menu after clicking a link */

document.querySelectorAll(".nav-link").forEach(link => {

    link.addEventListener("click", () => {

        navbar.classList.remove("show");

    });

});



/* =========================================
   PHOTO PREVIEW
========================================= */

const photoInput =
    document.getElementById("photo");

const photoPreview =
    document.getElementById("photoPreview");

const fileName =
    document.getElementById("fileName");


photoInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) {

        photoPreview.style.display = "none";

        fileName.textContent = "";

        return;

    }

    fileName.textContent =
        `Selected file: ${file.name}`;


    const reader = new FileReader();


    reader.onload = function (event) {

        photoPreview.src =
            event.target.result;

        photoPreview.style.display =
            "block";

    };


    reader.readAsDataURL(file);

});


/* =========================================
   PHOTO UPLOAD (AI runs after submission)
========================================= */

photoInput.addEventListener("change", async function () {
    const file = this.files[0];
    const analysisBox = document.getElementById("photoAnalysis");

    analyzedPhotoFilename = null;
    analyzedPhotoData = null;
    analysisBox.classList.add("hidden");

    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
        alert("Photo must be 8 MB or smaller.");
        this.value = "";
        return;
    }

    analysisBox.classList.remove("hidden");
    analysisBox.innerHTML = "<strong>Uploading photo...</strong><br>AI analysis will run after your complaint is submitted.";

    photoUploadPromise = (async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_BASE_URL}/api/submissions/upload-photo`, {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "Photo analysis failed");

        analyzedPhotoFilename = result.data.photo_filename;
        analysisBox.innerHTML = "<strong>Photo attached.</strong><br>AI analysis will appear in the Admin portal shortly after submission.";
      } catch (error) {
        console.error("Photo analysis error:", error);
        analyzedPhotoFilename = null;
        analysisBox.innerHTML = "<strong>Photo upload unavailable.</strong><br>You can still submit the complaint.";
      }
    })();

    await photoUploadPromise;
});

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================================
   VOICE COMPLAINT (BROWSER SPEECH-TO-TEXT)
========================================= */

const voiceButton = document.getElementById("voiceButton");
const voiceStatus = document.getElementById("voiceStatus");
const descriptionInput = document.getElementById("description");

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

/* =========================================
   SIMILAR COMPLAINT DETECTION
========================================= */

const similarButton = document.getElementById("similarButton");
const similarResults = document.getElementById("similarResults");

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


/* =========================================
   SUBMIT COMPLAINT - BACKEND API
========================================= */
let complaintSubmitting = false;
let analyzedPhotoFilename = null;
let analyzedPhotoData = null;
let photoUploadPromise = null;

const complaintForm =
    document.getElementById("complaintForm");
/* =========================================
   GET REAL USER LOCATION
========================================= */

function getUserLocation() {
    return new Promise((resolve, reject) => {

        if (!navigator.geolocation) {
            reject(
                new Error(
                    "Geolocation is not supported by this browser."
                )
            );
            return;
        }

        navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    });
}

complaintForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        // Prevent duplicate submissions
        if (complaintSubmitting) {
            console.log("Duplicate submission blocked.");
            return;
        }

        complaintSubmitting = true;

        /* Get severity */
        const selectedSeverity =
            document.querySelector(
                'input[name="severity"]:checked'
            );

        if (!selectedSeverity) {
            alert("Please select severity.");
            complaintSubmitting = false;
            return;
        }

        /* Get form values */
        const name =
            document.getElementById("name").value.trim();

        const phone =
            document.getElementById("phone").value.trim();

        const village =
            document.getElementById("village").value.trim();

        const district =
            document.getElementById("district").value.trim();

        const category =
            document.getElementById("category").value;

        const language =
            document.getElementById("language").value;

        const severity =
            selectedSeverity.value;

        const description =
            document.getElementById("description")
                .value
                .trim();


        /* =========================================
           SEND DATA TO FASTAPI
        ========================================= */

        try {

            // A selected photo is uploaded locally, not analyzed, before submission.
            // Waiting here only covers the file upload and avoids losing the photo.
            if (photoUploadPromise) await photoUploadPromise;

            // =========================================
            // GET REAL GPS LOCATION
            // =========================================

            const position = await getUserLocation();

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            console.log("Real GPS location:", latitude, longitude);


            // =========================================
            // SEND DATA TO FASTAPI
            // =========================================

            const response = await fetch(
                `${API_BASE_URL}/api/submissions`,
                {
                    method: "POST",

                    headers: {
                       "Content-Type": "application/json"
                  },

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

                     photo_filename: analyzedPhotoFilename,
                     photo_analysis: analyzedPhotoData ? JSON.stringify(analyzedPhotoData) : null
            })
        }
    );


            /* =========================================
               CHECK RESPONSE
            ========================================= */

            if (!response.ok) {

                const errorData =
                    await response.json();

                console.error(
                    "Backend error:",
                    errorData
                );

                alert(
                    "Failed to submit complaint. Please try again."
                );

                return;
            }


            /* =========================================
               GET BACKEND RESPONSE
            ========================================= */

            const result =
                await response.json();

            console.log(
                "Backend response:",
                result
            );


            /* =========================================
               GET REAL DATABASE ID
            ========================================= */

            const backendId =
                result.data?.id ||
                result.id;


            const complaintId =
                backendId
                    ? `CMP-${backendId}`
                    : generateComplaintId();


            /* =========================================
               SAVE LAST ID
            ========================================= */

            localStorage.setItem(
                "lastComplaintId",
                complaintId
            );


            /* =========================================
               SHOW SUCCESS
            ========================================= */

            document.getElementById(
                "generatedId"
            ).textContent = complaintId;


            document.getElementById(
                "success"
            ).classList.remove("hidden");


            /* =========================================
               RESET FORM
            ========================================= */

            complaintForm.reset();

            photoPreview.style.display =
                "none";

            fileName.textContent = "";
            analyzedPhotoFilename = null;
            analyzedPhotoData = null;
            photoUploadPromise = null;
            document.getElementById("photoAnalysis").classList.add("hidden");
            similarResults.classList.add("hidden");
            voiceStatus.textContent = "";


            /* =========================================
               SCROLL TO SUCCESS
            ========================================= */

            document.getElementById(
                "success"
            ).scrollIntoView({
                behavior: "smooth"
            });


            console.log(
                "Complaint successfully stored in database:",
                result
            );

        } catch (error) {

            console.error(
                "Connection error:",
                error
            );

            alert("Cannot connect to CivicAI backend. Please try again.");
        }

    finally {
        complaintSubmitting = false;
    }

    }
);


/* =========================================
   TRACK COMPLAINT - BACKEND CONNECTED
========================================= */

const trackForm = document.getElementById("trackForm");

if (trackForm) {

    trackForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const enteredId = document
            .getElementById("trackId")
            .value
            .trim()
            .toUpperCase();

        const result = document.getElementById("trackResult");

        result.classList.remove("hidden");

        /* Remove CMP- prefix */
        const submissionId = enteredId.replace(/^CMP-/i, "");

        /* Validate ID */
        if (!submissionId || isNaN(submissionId)) {

            result.innerHTML = `
                <div style="
                    text-align:center;
                    padding:20px;
                ">
                    <div style="
                        font-size:35px;
                        margin-bottom:10px;
                    ">
                        ⚠️
                    </div>

                    <h3>Invalid Complaint ID</h3>

                    <p style="
                        color:#64748b;
                        margin-top:5px;
                    ">
                        Please enter a valid Complaint ID
                        such as CMP-1.
                    </p>
                </div>
            `;

            return;
        }

        try {

            console.log(
                "Tracking submission:",
                submissionId
            );

            /* =========================================
               GET ONE SUBMISSION FROM FASTAPI
            ========================================= */

            const response = await fetch(
                `${API_BASE_URL}/api/submissions/${submissionId}`
            );

            console.log(
                "Tracking response status:",
                response.status
            );

            if (!response.ok) {

                if (response.status === 404) {
                    throw new Error(
                        "Complaint not found"
                    );
                }

                throw new Error(
                    "Failed to fetch complaint"
                );
            }

            const responseData = await response.json();

            console.log(
                "Backend complaint:",
                responseData
            );

            /*
               The GET /{submission_id} endpoint
               should return one submission.
            */

            const complaint =
                responseData.data ?? responseData;

            if (!complaint || !complaint.id) {

                result.innerHTML = `
                    <div style="
                        text-align:center;
                        padding:20px;
                    ">

                        <div style="
                            font-size:35px;
                            margin-bottom:10px;
                        ">
                            ⚠️
                        </div>

                        <h3>Complaint Not Found</h3>

                        <p style="
                            color:#64748b;
                            margin-top:5px;
                        ">
                            Please check your Complaint ID
                            and try again.
                        </p>

                    </div>
                `;

                return;
            }


            /* =========================================
               GET CURRENT STATUS
            ========================================= */

            const status =
                complaint.status || "Submitted";


            const submittedComplete = true;

            const underReviewComplete =
                status === "Under Review" ||
                status === "Action Planned" ||
                status === "Resolved";

            const actionComplete =
                status === "Action Planned" ||
                status === "Resolved";

            const resolvedComplete =
                status === "Resolved";


            /* =========================================
               FORMAT DATE
            ========================================= */

            let submittedDate = "N/A";

            if (complaint.created_at) {

                submittedDate =
                    new Date(
                        complaint.created_at
                    ).toLocaleDateString(
                        "en-IN",
                        {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                        }
                    );
            }


            /* =========================================
               DISPLAY RESULT
            ========================================= */

            result.innerHTML = `

                <div class="result-header">

                    <div>

                        <h3>
                            ${complaint.category || "Complaint"}
                        </h3>

                        <p>
                            Complaint ID:
                            <strong>
                                CMP-${complaint.id}
                            </strong>
                        </p>

                        <p>
                            Submitted:
                            ${submittedDate}
                        </p>

                    </div>

                    <div class="status-badge">
                        ${status}
                    </div>

                </div>


                <div style="
                    margin-top:20px;
                    padding:15px;
                    background:#f8fafc;
                    border-radius:8px;
                ">

                    <p style="
                        font-size:12px;
                        color:#64748b;
                    ">
                        LOCATION
                    </p>

                    <strong>
                        ${complaint.ward || ""}
                    </strong>


                    <p style="
                        font-size:12px;
                        color:#64748b;
                        margin-top:12px;
                    ">
                        PROBLEM
                    </p>

                    <p>
                        ${complaint.description || ""}
                    </p>

                </div>


                <div class="timeline">

                    <div class="
                        timeline-item
                        ${submittedComplete ? "completed" : ""}
                    ">

                        <strong>
                            Complaint Submitted
                        </strong>

                        <p>
                            Your complaint has been received.
                        </p>

                    </div>


                    <div class="
                        timeline-item
                        ${underReviewComplete ? "completed" : "current"}
                    ">

                        <strong>
                            Under Review
                        </strong>

                        <p>
                            The complaint is being reviewed.
                        </p>

                    </div>


                    <div class="
                        timeline-item
                        ${actionComplete ? "completed" : ""}
                    ">

                        <strong>
                            Action Planned
                        </strong>

                        <p>
                            Appropriate action is being planned.
                        </p>

                    </div>


                    <div class="
                        timeline-item
                        ${resolvedComplete ? "completed" : ""}
                    ">

                        <strong>
                            Resolved
                        </strong>

                        <p>
                            The complaint has been resolved.
                        </p>

                    </div>

                </div>
            `;


            result.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });


        } catch (error) {

            console.error(
                "Tracking error:",
                error
            );

            result.innerHTML = `
                <div style="
                    text-align:center;
                    padding:20px;
                ">

                    <div style="
                        font-size:35px;
                        margin-bottom:10px;
                    ">
                        ❌
                    </div>

                    <h3>
                        Unable to Track Complaint
                    </h3>

                    <p style="
                        color:#64748b;
                        margin-top:5px;
                    ">
                        ${error.message}
                    </p>

                </div>
            `;
        }

    });

}

/* =========================================
   COPY COMPLAINT ID
========================================= */

function copyComplaintId() {

    const id =
        document.getElementById(
            "generatedId"
        ).textContent;


    navigator.clipboard.writeText(id);


    showToast(
        "Complaint ID copied!"
    );

}


/* =========================================
   TOAST
========================================= */

function showToast(message) {

    const toast =
        document.getElementById("toast");


    toast.textContent =
        message;


    toast.classList.add("show");


    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);

}


/* =========================================
   AUTO-FILL LAST COMPLAINT ID
========================================= */

window.addEventListener(
    "load",
    function () {

        const lastId =
            localStorage.getItem(
                "lastComplaintId"
            );


        if (lastId) {

            document.getElementById(
                "trackId"
            ).value = lastId;

        }

    }
);
