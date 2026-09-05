// ============================================================
// MEDLENS BACKEND
// Node.js + Express
// Database intentionally excluded for now
// ============================================================


// ============================================================
// IMPORT MODULES
// ============================================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");


const { GoogleGenAI } = require("@google/genai");

const gemini = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// ============================================================
// CREATE EXPRESS APPLICATION
// ============================================================

const app = express();


// ============================================================
// SERVER PORT
// ============================================================

const PORT = 3000;


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
    cors()
);


app.use(
    express.json({
        limit: "10mb"
    })
);


app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);


// ============================================================
// SERVE FRONTEND
// ============================================================

app.use(
    express.static(
        path.join(__dirname)
    )
);


// ============================================================
// UPLOAD DIRECTORY
// ============================================================

const uploadDirectory =
    path.join(
        __dirname,
        "uploads"
    );


if (!fs.existsSync(uploadDirectory)) {

    fs.mkdirSync(
        uploadDirectory,
        {
            recursive: true
        }
    );

}


// ============================================================
// MULTER CONFIGURATION
// ============================================================

const storage =
    multer.diskStorage({

        destination: function (
            request,
            file,
            callback
        ) {

            callback(
                null,
                uploadDirectory
            );

        },


        filename: function (
            request,
            file,
            callback
        ) {

            const extension =
                path.extname(
                    file.originalname
                );


            const fileName =
                `report-${Date.now()}${extension}`;


            callback(
                null,
                fileName
            );

        }

    });


const upload =
    multer({

        storage: storage,

        limits: {

            fileSize:
                10 * 1024 * 1024

        },

        fileFilter:
            function (
                request,
                file,
                callback
            ) {

                const allowedExtensions = [

                    ".pdf",
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".txt"

                ];


                const extension =
                    path.extname(
                        file.originalname
                    ).toLowerCase();


                if (
                    allowedExtensions
                        .includes(extension)
                ) {

                    callback(
                        null,
                        true
                    );

                } else {

                    callback(
                        new Error(
                            "Unsupported medical report format."
                        )
                    );

                }

            }

    });


// ============================================================
// TEMPORARY IN-MEMORY DATA
// ============================================================

const patients = [];

const reports = [];

const auditLogs = [];


// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
    "/api/health",
    function (
        request,
        response
    ) {

        response.json({

            success: true,

            application:
                "MedLens",

            message:
                "Backend is running",

            database:
                "Not connected yet",

            timestamp:
                new Date().toISOString()

        });

    }
);


// ============================================================
// GET FRONTEND
// ============================================================

app.get(
    "/",
    function (
        request,
        response
    ) {

        response.sendFile(
            path.join(
                __dirname,
                "index.html"
            )
        );

    }
);


// ============================================================
// CREATE PATIENT
// ============================================================

app.post(
    "/api/patients",
    function (
        request,
        response
    ) {

        try {

            const {

                name,
                dob,
                age,
                sex,
                phone,
                email,
                symptoms,
                conditions,
                allergies,
                medications

            } = request.body;


            if (!name) {

                return response
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Patient name is required."

                    });

            }


            const patient = {

                id:
                    `ML-${Date.now()}`,

                name,

                dob:
                    dob || null,

                age:
                    age || null,

                sex:
                    sex || null,

                phone:
                    phone || null,

                email:
                    email || null,

                symptoms:
                    symptoms || "",

                conditions:
                    conditions || "",

                allergies:
                    allergies || "",

                medications:
                    medications || "",

                source:
                    "USER_PROVIDED",

                createdAt:
                    new Date().toISOString()

            };


            patients.push(
                patient
            );


            auditLogs.push({

                action:
                    "Patient information created",

                source:
                    "USER",

                patientId:
                    patient.id,

                timestamp:
                    new Date().toISOString()

            });


            return response
                .status(201)
                .json({

                    success: true,

                    message:
                        "Patient created successfully.",

                    patient

                });


        } catch (error) {

            console.error(
                "Patient creation error:",
                error
            );


            return response
                .status(500)
                .json({

                    success: false,

                    message:
                        "Unable to create patient."

                });

        }

    }
);


// ============================================================
// GET PATIENTS
// ============================================================

app.get(
    "/api/patients",
    function (
        request,
        response
    ) {

        response.json({

            success: true,

            count:
                patients.length,

            patients

        });

    }
);


// ============================================================
// GET SINGLE PATIENT
// ============================================================

app.get(
    "/api/patients/:id",
    function (
        request,
        response
    ) {

        const patient =
            patients.find(
                item =>
                    item.id ===
                    request.params.id
            );


        if (!patient) {

            return response
                .status(404)
                .json({

                    success: false,

                    message:
                        "Patient not found."

                });

        }


        response.json({

            success: true,

            patient

        });

    }
);


// ============================================================
// UPLOAD MEDICAL REPORT
// ============================================================

app.post(
    "/api/reports/upload",
    upload.single("report"),

    function (
        request,
        response
    ) {

        try {

            if (!request.file) {

                return response
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "No medical report uploaded."

                    });

            }


            const report = {

                id:
                    `REPORT-${Date.now()}`,

                originalName:
                    request.file.originalname,

                storedName:
                    request.file.filename,

                path:
                    request.file.path,

                size:
                    request.file.size,

                mimeType:
                    request.file.mimetype,

                source:
                    "USER_UPLOADED",

                status:
                    "UPLOADED",

                uploadedAt:
                    new Date().toISOString()

            };


            reports.push(
                report
            );


            auditLogs.push({

                action:
                    "Medical report uploaded",

                source:
                    "USER",

                reportId:
                    report.id,

                timestamp:
                    new Date().toISOString()

            });


            response.status(201).json({

                success: true,

                message:
                    "Medical report uploaded.",

                report

            });


        } catch (error) {

            console.error(
                "Upload error:",
                error
            );


            response
                .status(500)
                .json({

                    success: false,

                    message:
                        "Report upload failed."

                });

        }

    }
);


// ============================================================
// PROCESS REPORT
// ============================================================

app.post(
    "/api/reports/process",
    upload.single("report"),

    async function (
        request,
        response
    ) {

        try {

            if (!request.file) {

                return response
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Please upload a medical report."

                    });

            }


            console.log(
                "Processing:",
                request.file.originalname
            );


            /*
             * =================================================
             * IMPORTANT
             *
             * This is where the actual AI document
             * extraction service will be connected.
             *
             * Later this function can:
             *
             * 1. Read PDF/image
             * 2. OCR if required
             * 3. Send extracted text to AI
             * 4. Extract tests
             * 5. Extract values
             * 6. Extract units
             * 7. Extract reference ranges
             * 8. Extract report date
             * 9. Extract observations
             * 10. Calculate status ONLY when source
             *     reference range exists
             *
             * =================================================
             */


            const extractedData = {

                reportName:
                    request.file.originalname,

                reportDate:
                    null,

                laboratoryResults: [],

                observations: [],

                source:
                    "AI_EXTRACTED",

                confidence:
                    null,

                requiresHumanVerification:
                    true

            };


            const processedReport = {

                id:
                    `REPORT-${Date.now()}`,

                file:
                    request.file.filename,

                status:
                    "PROCESSED",

                extraction:
                    extractedData,

                createdAt:
                    new Date().toISOString()

            };


            reports.push(
                processedReport
            );


            auditLogs.push({

                action:
                    "Medical report processed",

                source:
                    "AI",

                reportId:
                    processedReport.id,

                timestamp:
                    new Date().toISOString()

            });


            response.json({

                success: true,

                message:
                    "Medical report processed successfully.",

                report:
                    processedReport

            });


        } catch (error) {

            console.error(
                "Processing error:",
                error
            );


            response
                .status(500)
                .json({

                    success: false,

                    message:
                        "Unable to process report."

                });

        }

    }
);


// ============================================================
// GET REPORTS
// ============================================================

app.get(
    "/api/reports",
    function (
        request,
        response
    ) {

        response.json({

            success: true,

            count:
                reports.length,

            reports

        });

    }
);


// ============================================================
// STRUCTURED MEDICAL RECORD
// ============================================================

app.get(
    "/api/records/:patientId",
    function (
        request,
        response
    ) {

        const patient =
            patients.find(
                item =>
                    item.id ===
                    request.params.patientId
            );


        response.json({

            success: true,

            patient:
                patient || null,

            laboratoryResults: [],

            medications:
                patient
                    ? patient.medications
                    : "",

            allergies:
                patient
                    ? patient.allergies
                    : "",

            conditions:
                patient
                    ? patient.conditions
                    : "",

            symptoms:
                patient
                    ? patient.symptoms
                    : "",

            provenance: {

                patientInformation:
                    "USER_PROVIDED",

                reportInformation:
                    "AI_EXTRACTED",

                summary:
                    "AI_GENERATED"

            }

        });

    }
);


// ============================================================
// VERIFY MEDICAL INFORMATION
// ============================================================

app.post(
    "/api/records/verify",
    function (
        request,
        response
    ) {

        const {

            recordId,
            verifiedBy,
            changes

        } = request.body;


        auditLogs.push({

            action:
                "Medical information verified",

            recordId:
                recordId || null,

            verifiedBy:
                verifiedBy || "Medical Staff",

            changes:
                changes || {},

            source:
                "HUMAN_VERIFIED",

            timestamp:
                new Date().toISOString()

        });


        response.json({

            success: true,

            message:
                "Information marked as human verified.",

            verification: {

                verified:
                    true,

                verifiedBy:
                    verifiedBy || "Medical Staff",

                verifiedAt:
                    new Date().toISOString()

            }

        });

    }
);


// ============================================================
// AI SUMMARY ENDPOINT
// ============================================================

app.post("/api/ai/summary", async (req, res) => {
    try {
        const { patient, medicalData } = req.body;

        const prompt = `
You are MedLens AI, a medical information summarization assistant.

Your task is ONLY to summarize the information provided.

STRICT RULES:
- Do NOT diagnose any disease.
- Do NOT prescribe medicines.
- Do NOT recommend dosage changes.
- Do NOT invent medical values.
- Do NOT invent reference ranges.
- Use only the information supplied.
- Clearly identify missing information.
- Clearly identify information that needs human verification.
- Keep the language simple and patient-friendly.
- This is an informational summary and not a medical diagnosis.

Patient Information:
${JSON.stringify(patient || {}, null, 2)}

Medical Information:
${JSON.stringify(medicalData || {}, null, 2)}

Generate the following sections:

1. Patient Overview
2. Important Medical Information
3. Laboratory Findings
4. Abnormal Values
5. Missing Information
6. Information Requiring Human Verification

For laboratory findings:
- Compare values ONLY against the reference ranges supplied.
- If no reference range is supplied, say "Reference range not provided".
`;

        const response = await gemini.models.generateContent({
            model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
            contents: prompt
        });

        const summary = response.text;

        res.json({
            success: true,
            summary: summary,
            generatedBy: "Gemini AI"
        });

    } catch (error) {
        console.error("Gemini AI Error:", error);

        res.status(500).json({
            success: false,
            message: "Gemini AI summary failed",
            error: error.message
        });
    }
});


// ============================================================
// CONFLICT DETECTION
// ============================================================

app.post(
    "/api/records/conflicts",
    function (
        request,
        response
    ) {

        const {

            currentData,
            previousData

        } = request.body;


        const conflicts = [];


        /*
         * Later implementation can compare:
         *
         * - patient age
         * - allergies
         * - medications
         * - conditions
         * - laboratory values
         * - dates
         * - conflicting report information
         */


        response.json({

            success: true,

            conflicts,

            conflictCount:
                conflicts.length

        });

    }
);


// ============================================================
// REPORT COMPARISON
// ============================================================

app.post(
    "/api/reports/compare",
    function (
        request,
        response
    ) {

        const {

            currentReport,
            previousReport

        } = request.body;


        response.json({

            success: true,

            message:
                "Report comparison endpoint ready.",

            comparison: {

                current:
                    currentReport || null,

                previous:
                    previousReport || null,

                changes: []

            }

        });

    }
);


// ============================================================
// AUDIT HISTORY
// ============================================================

app.get(
    "/api/audit",
    function (
        request,
        response
    ) {

        response.json({

            success: true,

            count:
                auditLogs.length,

            logs:
                auditLogs

        });

    }
);


// ============================================================
// SEARCH
// ============================================================

app.get(
    "/api/search",
    function (
        request,
        response
    ) {

        const query =
            (
                request.query.q ||
                ""
            )
            .toLowerCase();


        const patientResults =
            patients.filter(
                patient =>

                    patient.name
                        .toLowerCase()
                        .includes(query)

                    ||

                    (
                        patient.email ||
                        ""
                    )
                    .toLowerCase()
                    .includes(query)

                    ||

                    (
                        patient.phone ||
                        ""
                    )
                    .includes(query)

            );


        response.json({

            success: true,

            query,

            results:
                patientResults

        });

    }
);


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
    function (
        error,
        request,
        response,
        next
    ) {

        console.error(
            "Server error:",
            error
        );


        response
            .status(500)
            .json({

                success: false,

                message:
                    error.message ||
                    "Internal server error."

            });

    }
);


// ============================================================
// START SERVER
// ============================================================

app.listen(
    PORT,
    function () {

        console.log(
            "======================================"
        );

        console.log(
            "       MEDLENS BACKEND SERVER"
        );

        console.log(
            "======================================"
        );

        console.log(
            `Server running at: http://localhost:${PORT}`
        );

        console.log(
            `Frontend: http://localhost:${PORT}`
        );

        console.log(
            "Database: NOT CONNECTED"
        );

        console.log(
            "======================================"
        );

    }
);