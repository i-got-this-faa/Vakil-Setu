# Software Requirements Specification (SRS)
## Project: Vakil Setu (वकील सेतु)
### Voice-First Bilingual Legal Triage & Advocate Discovery Platform

---

**Document Identifier**: SRS-VAKIL-SETU-2026-V1.0  
**Standard**: Conforming to IEEE Std 830-1998 / ISO/IEC/IEEE 29148:2018  
**Status**: Baseline / Draft  
**Version**: 1.0 (Current MVP) & 2.0 (Target Architecture)  
**Date**: October 2026  

---

## Table of Contents
1. [Introduction](#1-introduction)
   - 1.1 Purpose
   - 1.2 Document Conventions
   - 1.3 Intended Audience
   - 1.4 Project Scope
   - 1.5 Definitions, Acronyms, and Abbreviations
   - 1.6 References
2. [Overall Description](#2-overall-description)
   - 2.1 Product Perspective
   - 2.2 User Classes and Characteristics
   - 2.3 Operating Environment
   - 2.4 Design and Implementation Constraints
   - 2.5 Assumptions and Dependencies
3. [Feature Status Matrix (Implemented vs. Planned)](#3-feature-status-matrix)
4. [Specific Functional Requirements](#4-specific-functional-requirements)
   - 4.1 Module 1: Voice & Conversational Input Subsystem
   - 4.2 Module 2: Legal Triage & AI Intelligence Subsystem
   - 4.3 Module 3: Advocate Directory & Matching Subsystem
   - 4.4 Module 4: Consultation Booking & Payment Escrow Subsystem
   - 4.5 Module 5: Emergency Legal SOS & Public Aid Subsystem
   - 4.6 Module 6: Document OCR & Statutory Limitation Subsystem (Planned)
5. [External Interface Requirements](#5-external-interface-requirements)
   - 5.1 User Interfaces
   - 5.2 Software Interfaces & APIs
   - 5.3 Communication Protocols
6. [Non-Functional Requirements (NFRs)](#6-non-functional-requirements)
   - 6.1 Performance and Latency
   - 6.2 Reliability and Availability (Failover Engine)
   - 6.3 Security and Cryptographic Integrity
   - 6.4 Usability and Accessibility (WCAG 2.1)
   - 6.5 Regulatory and Statutory Compliance
7. [Data Models & Schema Specifications](#7-data-models--schema-specifications)
   - 7.1 Advocate Schema
   - 7.2 Booking & Escrow Schema
   - 7.3 User Schema
   - 7.4 Triage Response Contract

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for **Vakil Setu**, an artificial intelligence-driven, voice-first legal triage and advocate consultation booking platform. It defines both the currently implemented functionality (MVP Phase 0) and the engineering requirements for planned development milestones (Phases 1 through 4).

### 1.2 Document Conventions
- **Requirement Tags**: Every requirement is uniquely indexed with prefixes:
  - `FR-<MODULE>-<ID>`: Functional Requirement
  - `NFR-<CATEGORY>-<ID>`: Non-Functional Requirement
  - `EIR-<INTERFACE>-<ID>`: External Interface Requirement
- **Requirement Levels**: Prioritized according to RFC 2119:
  - **SHALL**: Mandatory requirement.
  - **SHOULD**: Desirable requirement.
  - **MAY**: Optional / future extension.

### 1.3 Intended Audience
- **Academic Evaluators & Project Guides**: For assessment of technical scope, architecture, and regulatory alignment.
- **Software Engineers & Contributors**: For implementation, code refactoring, and integration testing.
- **System Administrators & Reviewers**: For verification of regulatory compliance and data security.

### 1.4 Project Scope
Vakil Setu is an informational triage bridge and professional directory service under Indian law. The software accepts spoken Hindi or English descriptions of disputes, classifies the grievance into canonical legal domains (Criminal, Civil, Family, Property), assesses statutory urgency, vocalizes plain-language procedural advice, matches users with verified enrolled advocates, and coordinates appointment scheduling with cryptographic payment verification.

> **Statutory Disclaimer**: The platform explicitly does not dispense direct legal advice, draft court pleadings, or act as an authorized attorney under Section 29 of the Advocates Act, 1961.

### 1.5 Definitions, Acronyms, and Abbreviations
| Term / Acronym | Definition |
| :--- | :--- |
| **AIBE** | All India Bar Examination (mandatory competency test conducted by BCI). |
| **BCI** | Bar Council of India (statutory regulatory body for legal practice). |
| **BNS / BNSS** | Bharatiya Nyaya Sanhita / Bharatiya Nagarik Suraksha Sanhita (Indian criminal codes). |
| **CNR** | Case Number Record (16-digit unique alphanumeric identifier under Indian e-Courts). |
| **COP** | Certificate of Practice (issued to advocates upon clearing AIBE). |
| **CPC / CrPC** | Code of Civil Procedure / Code of Criminal Procedure. |
| **DLSA / NALSA** | District / National Legal Services Authority (statutory free legal aid providers). |
| **HMAC** | Hash-Based Message Authentication Code (SHA-256 cryptographic verification). |
| **LLM** | Large Language Model (e.g., Google Gemini 2.0). |
| **SPA** | Single Page Application (React 18 + Vite). |
| **STT / TTS** | Speech-to-Text / Text-to-Speech. |

### 1.6 References
1. IEEE Std 830-1998: *IEEE Recommended Practice for Software Requirements Specifications*.
2. The Advocates Act, 1961 (Act No. 25 of 1961), Government of India.
3. Bar Council of India Rules (Rules Governing Advocates, Part VI, Chapter II, Section IV - Rule 36).
4. The Digital Personal Data Protection (DPDP) Act, 2023, Government of India.
5. W3C Web Speech API Community Group Specification (Speech Recognition & Synthesis).

---

## 2. Overall Description

### 2.1 Product Perspective
Vakil Setu operates as a decoupled, multi-tier web application combining client-side speech processing with an asynchronous Node.js backend, a dual-engine LLM/regex intelligence pipeline, and a persistent document database (MongoDB Atlas).

```
[ User (Voice/Text) ] 
       │
       ▼
[ Client Layer (React 18 + Web Speech API) ] ◄──► [ LocalStorage Session ]
       │ HTTPS / REST (JSON)
       ▼
[ Backend API Gateway (Node.js + Express) ]
       ├──► [ Dual-Engine AI (Gemini 2.0 / Rule Regex Engine) ]
       ├──► [ Data Persistence (MongoDB Atlas via Mongoose) ]
       ├──► [ Directory Scraper (Cheerio Crawler) ]
       └──► [ Payment Rail (Razorpay HMAC SHA-256 Escrow) ]
```

### 2.2 User Classes and Characteristics
1. **Citizen / Litigant (General Public)**:
   - Technical Literacy: Low to Medium.
   - Language Preference: Spoken Hindi, English, or mixed colloquial speech.
   - Objective: Quick understanding of dispute severity, required documents, and discovery of trustworthy lawyers.
2. **Advocate / Legal Professional**:
   - Technical Literacy: Medium to High.
   - Objective: Receiving pre-qualified, domain-relevant case leads and confirmed consultation fees without intermediaries.
3. **Platform Administrator**:
   - Technical Literacy: High.
   - Objective: Verifying advocate credentials, managing suspension takedowns, and monitoring system availability.

### 2.3 Operating Environment
- **Client Platforms**: Modern desktop and mobile browsers supporting W3C Web Speech API (Google Chrome 90+, Microsoft Edge 90+, Safari 14.1+).
- **Server Platform**: Node.js runtime environment (v18.x or v20.x LTS) deployed on standard cloud compute (Linux/x64).
- **Database**: MongoDB v6.0+ (Mongoose ODM v8.x).

### 2.4 Design and Implementation Constraints
- **Legal Non-Solicitation (Rule 36 BCI)**: Advocate profiles must display strictly objective credentials (years, domains, ratings); promotional advertisements or hyperbolic guarantees are prohibited.
- **Zero Server Audio Processing**: Voice transcription must execute on the client device to avoid high-cost streaming cloud audio servers.
- **Offline / Rate-Limit Resilience**: Inability to contact external AI APIs must not cause a 500 error; system must degrade gracefully to the rule engine.

### 2.5 Assumptions and Dependencies
- Users possess an operational microphone for voice dictation (with manual text input available as fallback).
- Third-party dependencies include Google Generative AI API (or college gateway) and Razorpay Checkout SDK.

---

## 3. Feature Status Matrix (Implemented vs. Planned)

| Feature Module | Feature Description | MVP Status | Target Phase |
| :--- | :--- | :---: | :---: |
| **Voice Input (STT)** | In-browser speech recognition in Hindi & English (`webkitSpeechRecognition`) | **IMPLEMENTED** | Phase 0 |
| **Voice Output (TTS)** | Speech synthesis reading triage summaries aloud (`window.speechSynthesis`) | **IMPLEMENTED** | Phase 0 |
| **AI Legal Triage** | Dual-engine issue classification under Indian law (Domain, Urgency, Actions) | **IMPLEMENTED** | Phase 0 |
| **Offline Failover** | Local rule-based regex engine for zero-downtime classification | **IMPLEMENTED** | Phase 0 |
| **Advocate Matching** | Querying MongoDB for domain-matched available advocates sorted by rating | **IMPLEMENTED** | Phase 0 |
| **Web Scraper** | Autonomous Cheerio crawler parsing LawRato directory listings into MongoDB | **IMPLEMENTED** | Phase 0 |
| **Razorpay Payments** | Order creation and cryptographic HMAC SHA-256 signature verification | **IMPLEMENTED** | Phase 0 |
| **Session Cache** | Client-side LocalStorage persistence for conversation history & triage results | **IMPLEMENTED** | Phase 0 |
| **Dual Homepage Input** | Direct text box input on homepage alongside microphone for desktop fallback | **IN PROGRESS** | Phase 1 |
| **Emergency SOS Hub** | Real 1-tap dials (112, 1091, 15100 NALSA) & statutory arrest rights card | **IN PROGRESS** | Phase 1 |
| **Advocate Profile Modal** | Detailed modal displaying Bar Council credentials, courts, and fixed slots | **IN PROGRESS** | Phase 1 |
| **Bar Council Verification** | State Bar Enrolment (`D/1420/2019`) & AIBE COP verification workflow | **PLANNED** | Phase 2 |
| **My Bookings Dashboard** | Client portal to view upcoming appointments, status, and PDF booking slips | **PLANNED** | Phase 2 |
| **Regulatory Suspension** | Automated query quarantine and Razorpay refund trigger for banned advocates | **PLANNED** | Phase 2 |
| **Legal Document OCR** | Real PDF/Image file upload and text extraction for FIRs and legal notices | **PLANNED** | Phase 3 |
| **Limitation Calculator** | Statutory countdown tracking under Indian Limitation Act, 1963 | **PLANNED** | Phase 3 |
| **Free Legal Aid Checker**| NALSA / DLSA eligibility evaluator under Legal Services Authorities Act | **PLANNED** | Phase 3 |
| **Indic 8-Language STT** | Expanding speech recognition to Bengali, Marathi, Tamil, Telugu, etc. | **ROADMAP** | Phase 4 |
| **e-Courts CNR Tracking** | Tracking court causes and next hearing dates via 16-digit CNR numbers | **ROADMAP** | Phase 4 |
| **WebRTC Video Consult** | Built-in peer-to-peer encrypted video calling and screen sharing | **ROADMAP** | Phase 4 |

---

## 4. Specific Functional Requirements

### 4.1 Module 1: Voice & Conversational Input Subsystem
- **FR-1.1 (Voice Recording)**: The system SHALL support real-time audio capture via browser `SpeechRecognition` without requiring third-party plugins.
- **FR-1.2 (Bilingual Support)**: The system SHALL accept voice input in `hi-IN` (Hindi) and `en-IN` (Indian English), selectable manually or inferred automatically.
- **FR-1.3 (Interim Streaming)**: The system SHALL stream intermediate transcription tokens into a visual draft bubble prior to submission.
- **FR-1.4 (Text Input Fallback)**: The system SHALL provide a manual text entry area on all triage interfaces for users without a microphone.
- **FR-1.5 (Speech Synthesis)**: The system SHALL provide a vocalization toggle (`Listen / सुनें`) reading the synthesized case summary in the response language.

### 4.2 Module 2: Legal Triage & AI Intelligence Subsystem
- **FR-2.1 (Domain Categorization)**: The system SHALL classify unstructured narratives into exactly one primary canonical domain: `criminal`, `civil`, `family`, or `property`.
- **FR-2.2 (Urgency Assessment)**: The system SHALL assign an urgency rating (`low`, `medium`, `high`, `emergency`) based on statutory limitation windows and threats of arrest or violence.
- **FR-2.3 (JSON Output Contract)**: The AI service SHALL constrain LLM output to a strict schema containing `domain`, `domain_label`, `urgency`, `summary`, and `actions`.
- **FR-2.4 (Deterministic Failover)**: If external LLM calls fail due to network disconnection, HTTP 429 (rate-limit), or HTTP 503 (timeout), the system SHALL route the narrative through `localFallbackClassification` without returning an HTTP 500 error.
- **FR-2.5 (Sliding Context Memory)**: Follow-up conversational queries SHALL retain the preceding 10 dialogue turns to provide contextual legal assistance.

### 4.3 Module 3: Advocate Directory & Matching Subsystem
- **FR-3.1 (Algorithmic Query)**: The system SHALL query MongoDB for active advocates whose `expertise` array contains the classified canonical domain slug.
- **FR-3.2 (Ranking Algorithm)**: Matched advocates SHALL be sorted in descending order by `rating` (primary) and `experienceYears` (secondary).
- **FR-3.3 (Autonomous Ingestion)**: The scraper script (`scrapeAdvocates.js`) SHALL crawl public advocate registries, parse embedded schema.org JSON-LD and DOM cards, and upsert records into MongoDB.
- **FR-3.4 (Credential Presentation)**: Advocate cards SHALL display verified years of practice, court affiliations, languages spoken, and Bar Council verification shields.
- **FR-3.5 (Regulatory Suspension Filter)**: The matching query SHALL exclude any advocate marked with `isSuspended: true` or `verificationStatus: 'suspended'`.

### 4.4 Module 4: Consultation Booking & Payment Escrow Subsystem
- **FR-4.1 (Appointment Scheduling)**: Litigants SHALL select a preferred date and time slot for legal consultation.
- **FR-4.2 (Order Generation)**: The backend SHALL invoke Razorpay Orders API (`POST /api/payments/create-order`) to issue a cryptographically signed `orderId`.
- **FR-4.3 (Signature Verification)**: The backend SHALL verify payment authenticity using HMAC SHA-256 hash recalculation:
  $$\text{Generated Signature} = \text{HMAC-SHA256}(\text{orderId} \parallel \text{paymentId}, \text{RAZORPAY\_SECRET})$$
- **FR-4.4 (Lifecycle State Machine)**: Booking records SHALL transition through finite states: `pending` &rarr; `confirmed` &rarr; `cancelled` &rarr; `completed`.
- **FR-4.5 (Automated Escrow Refund)**: In the event of advocate unavailability or regulatory suspension, the system SHALL trigger an automated refund via Razorpay Refund API.

### 4.5 Module 5: Emergency Legal SOS & Public Aid Subsystem
- **FR-5.1 (Instant SOS Hub)**: The emergency workflow SHALL provide direct 1-tap call triggers to `112` (Police), `1091` (Women Helpline), and `15100` (NALSA Free Legal Aid).
- **FR-5.2 (Arrest Rights Guidance)**: During criminal emergency triage, the system SHALL display a statutory checklist of rights under Section 35 of the Bharatiya Nagarik Suraksha Sanhita (BNSS) / Section 41 CrPC.
- **FR-5.3 (Priority Dispatch)**: High-stakes emergencies SHALL automatically route the user to the highest-rated active advocate available on duty.

### 4.6 Module 6: Document OCR & Statutory Limitation Subsystem (Planned)
- **FR-6.1 (Document Ingestion)**: The platform SHALL accept uploaded PDF and image files of legal notices, cheque bounce summons, and FIR copies.
- **FR-6.2 (Entity Extraction)**: The document analyzer SHALL extract statutory notice deadlines, financial claim amounts, and penal sections cited.
- **FR-6.3 (Limitation Countdown)**: The system SHALL compute remaining limitation windows under the **Limitation Act, 1963** (e.g., 30-day notice under Section 138 Negotiable Instruments Act) and display a visual countdown.

---

## 5. External Interface Requirements

### 5.1 User Interfaces
- **Responsive Layout**: Designed for 16:9 desktop presentation and standard mobile viewports (360px+).
- **Color Palette (Authoritative Legal-Tech)**:
  - Slate Background: `#0F172A`
  - Legal Navy: `#0C447C`
  - Warm Bronze / Amber: `#D97706`
  - Slate Surface: `#F8FAFC`
- **Dynamic Language Localization**: All UI elements, headers, and triage outputs dynamically switch between Devanagari Hindi and English.

### 5.2 Software Interfaces & APIs
| Service / Component | Protocol / API | Purpose |
| :--- | :--- | :--- |
| **W3C Web Speech API** | Browser Native JavaScript Interface | Real-time audio transcription and speech synthesis |
| **Google Generative AI** | REST / HTTPS (`generateContent`) | Large language model legal triage and summary generation |
| **MongoDB Atlas** | MongoDB Wire Protocol (`mongodb+srv://`) | Primary document database persistence |
| **Razorpay API** | REST / HTTPS (`v1/orders`, `v1/payments`) | Consultation payment processing and signature verification |

### 5.3 Communication Protocols
- Client-Server communication SHALL strictly execute over **HTTPS / TLS 1.3**.
- API payloads SHALL be structured strictly as standard `application/json`.

---

## 6. Non-Functional Requirements (NFRs)

### 6.1 Performance and Latency
- **NFR-PERF-1 (Speech Latency)**: Speech recognition interim tokens SHALL render within **200 milliseconds** on client devices.
- **NFR-PERF-2 (Triage Round-Trip)**: End-to-end AI triage processing round-trip SHALL complete within **3.5 seconds** under standard broadband connections.
- **NFR-PERF-3 (Failover Speed)**: Deterministic regex failover execution SHALL execute within **50 milliseconds** upon API timeout detection.

### 6.2 Reliability and Availability
- **NFR-REL-1 (Service Availability)**: The platform SHALL maintain a target uptime of **99.9%**.
- **NFR-REL-2 (Graceful Degradation)**: The server SHALL never throw an uncaught 500 error when external AI services or internet connections drop.

### 6.3 Security and Cryptographic Integrity
- **NFR-SEC-1 (Signature Verification)**: All financial confirmations SHALL be verified using server-side HMAC SHA-256 calculations; client-reported payment flags SHALL be rejected.
- **NFR-SEC-2 (Data Privacy)**: Sensitive case descriptions SHALL remain stored in client LocalStorage; no unencrypted personal litigation narratives SHALL be permanently retained in the database.
- **NFR-SEC-3 (Sanitization)**: All user inputs SHALL be sanitized to prevent NoSQL query injection and Cross-Site Scripting (XSS).

### 6.4 Usability and Accessibility (WCAG 2.1)
- **NFR-USA-1 (Audio Alternative)**: Every primary text result SHALL have an audio speech synthesis alternative.
- **NFR-USA-2 (Contrast Ratio)**: Text and interactive elements SHALL satisfy WCAG 2.1 AA standards (minimum 4.5:1 contrast ratio).

### 6.5 Regulatory and Statutory Compliance
- **NFR-REG-1 (Advocates Act 1961)**: The application SHALL display prominent disclaimers affirming it is an informational triage bridge, not a practicing advocate.
- **NFR-REG-2 (BCI Rule 36)**: Advocate directory listings SHALL remain non-promotional, objective, and neutral.
- **NFR-REG-3 (DPDP Act 2023)**: User session data SHALL support 1-click local cache clearing (`clearSession()`).

---

## 7. Data Models & Schema Specifications

### 7.1 Advocate Schema (`Advocate.js`)
```javascript
{
  name: { type: String, required: true },
  expertise: { type: [String], required: true, index: true }, // ['criminal', 'civil', ...]
  rating: { type: Number, default: 0, index: -1 },
  experienceYears: { type: Number, default: 0 },
  availability: { type: Boolean, default: true },
  languages: { type: [String], default: ["English", "Hindi"] },
  
  // Regulatory Credentials (Phases 1-2)
  barCouncilState: { type: String },
  enrolmentNumber: { type: String, unique: true, sparse: true }, // e.g. "D/1420/2019"
  copNumber: { type: String }, // AIBE Certificate of Practice
  verificationStatus: { 
    type: String, 
    enum: ["pending", "verified", "rejected", "suspended"], 
    default: "verified" 
  },
  isSuspended: { type: Boolean, default: false }
}
```

### 7.2 Booking & Escrow Schema (`Booking.js`)
```javascript
{
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  advocateId: { type: mongoose.Schema.Types.ObjectId, ref: "Advocate", required: true },
  status: { 
    type: String, 
    enum: ["pending", "confirmed", "cancelled", "completed"], 
    default: "pending" 
  },
  scheduledAt: { type: Date, required: true },
  paymentStatus: { 
    type: String, 
    enum: ["pending", "paid", "failed", "refunded"], 
    default: "pending" 
  },
  amount: { type: Number, default: 500 },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  isEmergency: { type: Boolean, default: false }
}
```

### 7.3 User Schema (`User.js`)
```javascript
{
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String, unique: true, sparse: true },
  preferredLanguage: { type: String, default: "en" }
}
```

### 7.4 Triage Response Contract (JSON Output Payload)
```json
{
  "domain": "criminal",
  "domain_label": "आपराधिक कानून",
  "urgency": "high",
  "response_language": "hi",
  "summary": "शिकायतकर्ता के अनुसार चेक अनादर और पुलिस नोटिस प्राप्त हुआ है। तत्काल कानूनी जवाब तैयार करना आवश्यक है।",
  "actions": [
    "चेक अनादर का बैंक मेमो सुरक्षित रखें।",
    "नोटिस प्राप्ति की तारीख से 15 दिनों के भीतर लिखित उत्तर दें।",
    "अपने क्षेत्र के योग्य आपराधिक/चेक बाउंस वकील से तुरंत संपर्क करें।"
  ]
}
```

---

## 8. Verification & Validation Traceability Matrix

| Requirement Index | Verification Method | Pass Criteria |
| :--- | :--- | :--- |
| **FR-1.1 / FR-1.2** | Browser Functional Test | Spoken Hindi/English renders transcribed text accurately within 500ms. |
| **FR-2.1 / FR-2.3** | Automated API Test (`POST /api/ai/classify`) | Output conforms 100% to JSON contract schema. |
| **FR-2.4** | Simulated Outage Test | Disconnecting network triggers regex fallback within 50ms with HTTP 200. |
| **FR-3.1 / FR-3.2** | MongoDB Integration Test | Returned advocates strictly match classified domain and sort by rating descending. |
| **FR-4.3 / NFR-SEC-1**| Cryptographic Signature Test | Manipulated Razorpay signatures return HTTP 400 rejection; valid HMAC passes. |
| **NFR-PERF-2** | Load & Performance Benchmark | Mean response time for `/api/ai/triage` < 3.5 seconds. |

---

*End of Software Requirements Specification (SRS) Document.*
