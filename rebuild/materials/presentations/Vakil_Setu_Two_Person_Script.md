# Vakil Setu: two-person presentation script

Order: P.R.O.J.E.C.T = Problem, Reason, Objective, Journey, Execution, Contribution, Takeaway.

Raghav Nargotra: backend. Siddharth Gupta: frontend.

Target duration: about 7 minutes, within the requested 5–8 minutes. Timings below total 6 minutes 40 seconds, allowing brief pauses and handovers. No live demo is included. Roll numbers come from the earlier presentation. Contribution responsibilities follow your confirmed backend/frontend split. Adjust module-level examples if your actual tasks differed. Repository evidence reviewed on 17 October 2026. No new application tests were run for this deck.

## Slide 1: Opening

**Speaker: Raghav. Target: 20 seconds.**

Good morning. We are Raghav Nargotra and Siddharth Gupta. Our project is Vakil Setu, a multilingual application for legal intake and advocate access. I handled the backend, and Siddharth handled the frontend. We will follow the P.R.O.J.E.C.T sequence, beginning with the problem. Siddharth will explain it.

## Slide 2: P — Problem

**Speaker: Siddharth. Target: 40 seconds.**

A person may know what happened in a dispute but struggle to identify the relevant legal area or prepare for a consultation. Formal vocabulary and long forms can add difficulty, especially when the person prefers Hindi or Punjabi. Search results and personal referrals can help, but the user still has to organise the facts and arrange a consultation separately. Vakil Setu connects those initial steps in one workflow. This is our problem hypothesis, and we still need user research to measure how widespread it is. Raghav will explain why we chose it.

## Slide 3: R — Reason

**Speaker: Raghav. Target: 35 seconds.**

We chose this problem because software can support a practical first step: recording the concern and preparing it for an advocate. The intended beneficiaries are people who prefer a familiar language or voice input, and advocates receiving a concise account. Our expected benefit is clearer preparation. We have not measured reduced effort or better legal outcomes. That distinction keeps our objective realistic. Siddharth will explain the scope.

## Slide 4: O — Objective

**Speaker: Siddharth. Target: 40 seconds.**

Our objective is a responsive application where users can enter a concern, review it, and save it privately. English, Hindi, and Punjabi are the pilot languages. The workflow then supports a reviewed summary, approved advocate discovery, and consultation requests. Sharing requires consent for a particular summary version and advocate. We judge success through task completion, correct permissions, and records that survive refresh. AI remains optional, so a manual summary still gives users a next step when the provider is unavailable.

## Slide 5: J — Journey

**Speaker: Raghav. Target: 40 seconds.**

We began by reviewing the SRS and auditing the older Vite and Express application. We then created a separate rebuild, defined the pilot languages, and prioritised the first-release workflow. We chose shared domain and language packages to support future reuse. During development, backend rules and frontend review states developed together. We checked local behaviour with tests, followed by selected checks against hosted development services. Payments, reviews, and native mobile remain deferred. That scope helped us concentrate on a reliable intake foundation.

## Slide 6: E — Execution: technology

**Speaker: Raghav. Target: 45 seconds.**

The frontend uses Next.js 16 and React, with Tailwind and shadcn components. Clerk handles identity, while Convex stores application records and enforces permissions. Bun and Turborepo organise the workspace tasks. The TypeScript native compiler handles type checking. We selected this structure to keep reusable domain and language logic separate from the web interface. The backend checks ownership and booking transitions even if someone bypasses the screen controls. An optional AI adapter requires configuration and consent. Live DGX inference remains unverified. Siddharth will describe the user flow.

## Slide 7: E — Execution: workflow

**Speaker: Siddharth. Target: 45 seconds.**

The user types a concern or uses speech input where supported, then reviews the text before saving. Saving stores the original intake without automatically running AI. The user can prepare a manual summary or review a configured AI draft. Next, they choose an advocate and consent to share a specific summary version. The backend checks the selected slot and reserves it atomically. A consultation becomes confirmed only after the advocate accepts. The interface shows the current status and failure states. The complete hosted advocate booking journey still needs acceptance testing.

## Slide 8: C — Contribution

**Speaker: Raghav + Siddharth. Target: 50 seconds.**

RAGHAV: My responsibility was the backend. That includes the data layer and the rules for private access, summary sharing, and consultation requests. One challenge was keeping a request separate from an accepted booking while preventing conflicting reservations. The backend rules and integration tests address those cases.

SIDDHARTH: My responsibility was the frontend. That includes the responsive interface and the multilingual intake and review flow. One challenge was making the next step clear when saving did not generate AI analysis. The interface now confirms the saved intake and offers manual summary preparation. We worked together on integration and used AI-assisted tools during development.

## Slide 9: T — Takeaway: outcome

**Speaker: Raghav. Target: 50 seconds.**

The recorded development check reports seventy-eight tests: sixty backend integration tests, twelve language tests, and six interface render tests. Real browser checks also confirmed Clerk login and a Punjabi intake that remained intact after reload. A reviewed summary persisted in a separate check. These results support specific behaviours. They do not establish complete production readiness. Live DGX inference, legal output quality, and language-level speech evaluation remain open. We also need hosted acceptance checks for advocate approval, independent-account access, and bookings. Our objective is therefore partly demonstrated, with clear remaining work.

## Slide 10: T — Takeaway: learning and next steps

**Speaker: Siddharth. Target: 35 seconds.**

Our main learning is that review, consent, and failure handling matter as much as the interface. If we repeated the project, we would involve pilot users earlier and test comprehension alongside technical behaviour. Next, we will validate the complete consultation journey and review the pilot languages with fluent speakers. AI needs the actual gateway contract and approved data terms before real case analysis. Vakil Setu demonstrates the intake foundation, and the next stage is validation in practice. Thank you.

## Viva preparation

**Is the AI running on DGX Spark?**
No live DGX call or hardware attribution has been verified. The legacy source contains a gateway contract. The rebuild keeps AI explicitly unavailable until configuration and validation.

**Does it replace legal advice?**
The platform supports intake and consultation preparation. A qualified advocate must review case-specific legal advice. No validated legal accuracy score is available.

**Does it support all 22 scheduled languages?**
The registry contains all 22 plus English. The current interface pilot is English, Hindi and Punjabi. A registry entry does not establish speech or AI quality.

**What is actually tested?**
The recorded 78 tests cover 60 backend cases, 12 language tests and 6 UI render cases. Hosted browser checks establish selected intake and summary behaviours. They do not establish complete hosted booking acceptance or measured legal accuracy.

**Why use a monorepo?**
It keeps shared domain and language packages alongside the web app, with coordinated build tasks. React Native remains future work.

**Why does saving not produce an AI analysis?**
Saving stores the original intake. AI processing is a separate action that requires a configured provider and consent. A reviewed manual summary remains available.

**What is the current limitation?**
The full hosted consultation journey, independent-account access checks, live AI quality and human language validation remain open. The interface language preference can reset on reload.

## Rehearsal and demo

Use synthetic case details only. Before presenting, check that localhost:3000 is running and that the development login works. If demonstrating, show language selection, reviewed intake, save confirmation and the manual summary path. Do not attempt an unverified AI or booking success on stage. A live demo adds time beyond this script.
