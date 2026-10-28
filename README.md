# Programimi për Pajisje Mobile · 2026/2027
Student assignments - Mobile Programming, Cloud Computing, and Mobile Cloud Computing

# 📚 Student Project Topic Catalogues

**Mobile 2026/27 — javët 1–15:** [Nis këtu për RideShare dhe dorëzimin me 3 hapa](https://arbenl.github.io/lendet/2026-2027/mobile/dorezimet.html). Dorëzimet javore përdorin formularin Issue; rezervimet me PR më poshtë u përkasin katalogëve të temave. Ky është repository i profesorit për lëndën aktuale 2026/2027; materialet historike mbeten të ruajtura.

Welcome! This repo contains assignment pools that students reserve with Pull Requests (PRs).
Each topic can be claimed by **exactly one** student.

- [`TOPICS.md`](TOPICS.md) — Mobile Programming topics, kept for the next mobile semester.
- [`CLOUD_TOPICS_2026.md`](CLOUD_TOPICS_2026.md) — Cloud Computing and Mobile Cloud Computing (MCC) topics for 2026.
- [`index.html`](index.html) — professional course profile where students choose catalogues by topic area and year.
- [`mcc-2026.html`](mcc-2026.html) — main visual browsing/reservation page for the MCC 2026 catalogue, including read-only scores for students.
- [`syllabus-mcc-2026.html`](syllabus-mcc-2026.html) — bilingual Cloud/MCC 2026 syllabus with free AWS SimuLearn modules for each week.
- [`submissions-2026.html`](submissions-2026.html) — read-only visual dashboard for final submissions and instructor scores.
- [`instructions-mcc-2026.html`](instructions-mcc-2026.html) — English static guide for reserving, solving, testing, and submitting assignments.
- [`udhezime-mcc-2026.html`](udhezime-mcc-2026.html) — Albanian static guide for reserving, solving, testing, and submitting assignments.
- [`SUBMISSIONS_2026.md`](SUBMISSIONS_2026.md) — final solution submission links.

Reservations are **first in, first served**: the first valid PR that passes automatic validation is merged automatically, reserves the topic, and makes it visible on the public site.
Students may change only one topic line when reserving or correcting their own reservation. New reservations use `Taken by Full Name <email@example.com>`, and students may include or later update `; Stack: Chosen stack` on that same line. Catalogue descriptions, score lines, pages, workflows, scripts, and docs are read-only for student claim PRs. One student can reserve only one assignment, and both full name and email are required. Final solutions are submitted later by changing exactly one line in `SUBMISSIONS_2026.md`.

## 🚀 Quick Claim Checklist

1. Hap `mcc-2026.html`, zgjidh temën dhe shkruaj emrin/email-in.
2. Kliko `Copy claim line`.
3. Kliko `Edit on GitHub`.
4. Në GitHub zëvendëso vetëm rreshtin e temës tënde me rreshtin e kopjuar.
5. Kliko `Propose changes` dhe hap Pull Request.
6. Prit validimin automatik; PR-ja e parë e vlefshme bashkohet automatikisht dhe tema bëhet e dukshme për të gjithë si e rezervuar.

Mos bëj këto gabime: mos edito `mcc-2026.html`, mos riemërto `CLOUD_TOPICS_2026.md`, mos fshi rreshtat `Cloud focus` ose `Score`, mos e përsërit titullin në status dhe mos vendos dy studentë në një temë.

## ✅ How to claim a topic

1) Fork this repository to your GitHub account.
2) Open the correct catalogue in your fork: `TOPICS.md` for Mobile Programming or `CLOUD_TOPICS_2026.md` for Cloud Computing/MCC 2026.
3) Find the topic you want (use the ID like `#07`).
4) Change the status from **(Available)** to **(Taken by YOUR FULL NAME <email@example.com>; Stack: YOUR CHOSEN STACK)**.
5) Do not change the score line or any description line. Scores are instructor-managed and shown as `0/30` or `Not graded`.
6) Commit the change in your fork and **open a Pull Request** back to this repo.
7) Fill the PR template completely (catalogue, name, email, topic ID, chosen stack, cloud/mobile services if relevant, 1-week plan, AI tools).
8) Wait for the **automated check** to pass. Valid reservation PRs are processed one at a time and merged automatically, so first-in, first-served is atomic.

> 🔒 Your copied line is not a reservation by itself. Once GitHub Actions **merges your valid PR automatically**, your topic becomes **unavailable** to others and appears on the public site as reserved.
> Open student PRs may appear on the MCC page as **pending** while automatic validation is running.

Common mistakes that are rejected: editing `mcc-2026.html`, renaming `CLOUD_TOPICS_2026.md`, deleting `Cloud focus` or `Score` lines, duplicating the topic title inside the status, or putting two students on one topic.

Need to check or correct your own reservation? On `mcc-2026.html`, use **Check your reservation** with the same full name or email from your merged PR. To add or change your stack, open another PR that changes only your existing topic line, keeping the same name or the same email so the validator can identify it as your reservation.

## ✉️ Failed PR email notifications

When a reservation PR fails, GitHub Actions always posts correction instructions as a PR comment. The workflow can also email the student automatically if these repository secrets are configured:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `SMTP_REPLY_TO` optional
- `SMTP_SSL` optional, use `true` for port `465`

If these secrets are not configured, the workflow skips email delivery and still leaves the PR comment. The recipient email is extracted from the changed reservation line or, if needed, from the PR title/body.

## ✉️ Evaluation email notifications

When the instructor adds or changes a line in `EVALUATIONS_2026.md`, GitHub Actions can email the evaluated student with the score, English/Albanian feedback, repository/demo links, the public evaluation page, and correction instructions. The recipient email is read from `SUBMISSIONS_2026.md`, with `CLOUD_TOPICS_2026.md` used as a fallback.

This uses the same SMTP repository secrets listed above. If they are missing, the workflow logs that email delivery was skipped. To send feedback to already evaluated students, run **Email Evaluation Feedback** manually from GitHub Actions with `evaluation_ids` set to `all`, or use comma-separated topic IDs such as `02,16,26`. The same workflow also supports a `repository_dispatch` event named `email-evaluations` for CLI/API triggering.

## 🕑 Daily PR merge and preliminary grading

GitHub Actions also runs **Daily PR Merge and Submission Grading** every 24 hours at `02:00 UTC`, and it can be started manually with a dry-run option.

The workflow:
- checks open PRs against `main` in creation order;
- merges valid reservation or final-submission PRs that change exactly one allowed line;
- comments on invalid PRs without repeating the same daily comment;
- then scans `SUBMISSIONS_2026.md` and adds preliminary `EVALUATIONS_2026.md` rows only for submitted topics that do not already have an evaluation.
- publishes the updated catalogues, submissions, evaluations, and static pages to `gh-pages`.

The preliminary grader uses public evidence only: GitHub repository reachability, README/setup guidance, source/dependency structure, cloud/MCC signals, demo availability, `AI-log.txt`, recent commits, and deployment/CI files. It does **not** execute student code, and it does not overwrite instructor-managed evaluation rows.

## ✅ How to submit the final solution

1) Build the solution in your own GitHub repository.
2) Include source code, README, setup/run/deploy instructions, screenshots or demo notes, and `AI-log.txt` if AI tools were used.
3) Open `SUBMISSIONS_2026.md` and change only the line for your topic. The public status appears on `submissions-2026.html` after the PR is merged.
4) Use this format:

```md
01. Cloud-hosted Task Collaboration Platform — (Submitted by YOUR FULL NAME <email@example.com>) — Repo: https://github.com/user/project — Demo: https://demo.example.com
```

Use `Demo: N/A` only when the project cannot reasonably be deployed, and explain how to run it locally in the project README.

## 🧭 Udhëzues i detajuar për rezervimin e një projekti (AL)

1. **Zgjidh idenë që të intereson:** Hap katalogun e duhur (`TOPICS.md` ose `CLOUD_TOPICS_2026.md`), lexo përshkrimet dhe shëno ID-në (p.sh. `07`) të projektit që dëshiron. Sigurohu që statusi i tij të jetë ende **(Available)**.
2. **Krijo fork në GitHub:** Kliko `Fork` në repo kryesor, në mënyrë që të punosh në kopjen tënde.
3. **Klono fork-un lokalisht:**  
   ```bash
   git clone https://github.com/<username>/arbenl-mobile-assignments-2026-2027.git
   cd arbenl-mobile-assignments-2026-2027
   ```
4. **Krijo një degë pune (opsionale por e rekomanduar):**  
   ```bash
   git checkout -b claim-topic-07
   ```
5. **Përditëso vetëm rreshtin e temës tënde në katalogun përkatës:** Ndrysho segmentin `— (Available)` në `— (Taken by EMRI MBIEMRI <email@example.com>; Stack: STACK-U I ZGJEDHUR)` duke ruajtur identik pjesën tjetër të rreshtit. Nëse e ke rezervuar tashmë temën, mund ta ndryshosh vetëm po atë rresht për të shtuar/ndryshuar `; Stack: ...`, por duhet të mbetet i njëjti emër ose i njëjti email.
6. **Ruaj dhe kontrollo ndryshimin:**  
   ```bash
   git status
   git diff
   ```
   Duhet të shfaqet vetëm një ndryshim në rreshtin e zgjedhur.
7. **Ekzekuto skriptin e verifikimit:**  
   ```bash
   node scripts/check-claim.js
   ```
   Vazhdon vetëm nëse shfaq `✅ Claim format looks valid.`; përndryshe rregullo gabimet që të tregohen.
8. **Bëj commit me një mesazh të qartë:**  
   ```bash
   git commit -am "Claim topic 07: Multi-language Translator Phrasebook"
   ```
9. **Shto degën në GitHub-in tënd:**  
   ```bash
   git push origin claim-topic-07
   ```
10. **Hap Pull Request te repo origjinal:** Zgjidh bazën `main`, përshkruaj shkurtimisht projektin, plotëso komplet shabllonin (emri yt, email-i, ID e temës, stack-u i zgjedhur, plani 1-javor, mjetet AI). GitHub Actions e kontrollon automatikisht.
11. **Monitoro PR-në:** Nëse PR-ja është e vlefshme, bashkohet automatikisht. Nëse dështon, lexo komentin automatik në PR, rregullo gabimin dhe shty commit të ri ose hap PR të ri.

## 🧑‍💻 Contributor Guidelines

- Maintainers and reviewers should follow the workflow documented in [`AGENTS.md`](AGENTS.md) for repository structure, validation steps, and PR expectations.

## 🔧 Allowed stacks & tools

- **Mobile stacks:** Flutter, React Native (Expo), Kotlin (Android), Swift (iOS)  
- **Cloud platforms:** AWS, Azure, Google Cloud, Vercel, Netlify, Render, Fly.io, Supabase, Firebase
- **Backend/API:** Node.js, Express, NestJS, FastAPI, Django, Spring Boot, serverless functions
- **Data/storage:** Supabase, Firebase/Firestore, PostgreSQL, MySQL, MongoDB, object storage, queues, analytics tools
- **DevOps:** Docker, GitHub Actions, Terraform/OpenTofu, Kubernetes, monitoring/logging tools
- **AI tools:** Gemini, GitHub Copilot, ChatGPT/Codex CLI  
- **Dev environments:** Replit, VS Code, GitHub Codespaces

## 🧠 Requirements for all projects

- Working app, API, automation, or mobile app that can be demonstrated clearly
- Mobile topics should run on device/emulator
- Cloud/MCC topics should include a deployed cloud component or reproducible deployment instructions
- Uses meaningful backend/cloud services such as auth, database, storage, serverless functions, queues, scheduled jobs, monitoring, or push notifications
- Uses AI productively when helpful (prompt logs saved in `AI-log.txt` in your app repo)
- Clear README with setup/run/deploy instructions
- Minimum 3 meaningful commits per week

## ❓ Questions

Open a **Discussion** or ask during class/Telegram group.  
Good luck!

## 📘 How to use these assignments as a student

- **Explore the catalog:** Review the relevant catalogue and shortlist ideas that fit your interests or portfolio goals.
- **Assess feasibility:** Compare the suggested schema, cloud services, and tooling with your existing skills to decide what you need to learn or prototype first.
- **Claim responsibly:** Once confident, follow the claiming workflow above so the topic is reserved in your name.
- **Plan your build:** Break the requirements into weekly milestones, documenting them in your own project board or tracker before you start coding.
- **Leverage AI effectively:** Keep a running `AI-log.txt` that records meaningful prompts and outputs you used for ideation, debugging, or asset creation.
- **Iterate and test:** Develop the app incrementally, demoing features on a device/emulator and validating Supabase integration as you go.
- **Reflect and share:** When finished, publish a concise case study or README section explaining what you built, challenges faced, and what you learned.

## Mobile 2026/2027 — RideShare, javët 1–15

Detyrën mund ta dorëzosh gjatë ushtrimeve ose gjatë javës. Dorëzimi brenda orës është synim për të marrë ndihmë në klasë, jo afat i detyrueshëm. Kontrolli automatik dhe komanda `rikontrollo` punojnë edhe jashtë orarit të mësimit. Afatin përfundimtar e njofton profesori.

Në ushtrime zhvillojmë RideShare gjatë semestrit. Secili student krijon një repository personal `rideshare-mobile` (Public + README), ose vazhdon në repository-n personal që ka. Dokumentet ngarkohen aty, jo në këtë repository të profesorit.

1. Ngarko dokumentet nga shfletuesi: Add file → Upload files → Commit changes.
2. Java 1: `exit-ticket.md` dhe `prd.md` (pranohen edhe PDF/DOCX/TXT). Java 2: `java-02.md` dhe `skica.jpg/png`. Javët 3–15: raporti `java-NN.md` dhe kodi Next.js i përditësuar sipas udhëzimit të javës.
3. [Dorëzo linkun](https://github.com/arbenl/arbenl-mobile-assignments-2026-2027/issues/new?template=mobile-submission.yml), zgjidh javën dhe kliko Create / Submit new issue. Raporti automatik shfaqet si koment në atë faqe.

[Udhëzimi i plotë me 3 hapa](https://arbenl.github.io/lendet/2026-2027/mobile/dorezimet.html). Për javët 1–2 mjafton ngarkimi nga shfletuesi. Nga java 3 ruaj kodin me Commit → Push; dorëzimi i linkut vazhdon me të njëjtin formular Issue. Nuk kërkohet fork ose Pull Request për dorëzimet javore. Mos publiko Student ID, sekrete ose të dhëna reale udhëtarësh. Repository privat kërkon dorëzim të asistuar; ftimi vetëm i profesorit nuk i jep qasje automatizimit.

Pas korrigjimit të skedarëve, komento `rikontrollo` në të njëjtin issue. Kontrolli teknik i skedarëve nuk është notë e cilësisë. Nuk përdor AI dhe nuk ekzekuton kodin e studentit. Lexon një version të repository-t përmes GitHub API dhe përditëson një raport, pa grumbulluar pikë nga tentimet.

Kjo rrugë është vetëm për Mobile. Rezervimet dhe dorëzimet Cloud/MCC vazhdojnë me rregullat e tyre.

### Java 7 · kontrolli i MVP-së (Mobile 2026/2027)

Ndiq [udhëzimin e Javës 7](https://arbenl.github.io/lendet/2026-2027/mobile/java-07/ushtrimet.html). Dorëzo `java-07.md` me rastin, parashikimin, dy probleme, korrigjimin, tri prova dhe lidhjet Para/Pas të commit-eve. Push-i i raportit final mund të vijë pas commit-it Pas. Kontrollohen pesë kërkesa teknike, pa ekzekutuar kod ose përdorur AI; shpjegimi dhe demonstrimi verifikohen në klasë. Dorëzimi lejohet edhe gjatë javës.
