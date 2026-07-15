document.addEventListener("DOMContentLoaded", () => {
    // -------------------------------------------------------------
    // 1. Core State & UI Element Selectors
    // -------------------------------------------------------------
    const sidebar = document.getElementById("app-sidebar");
    const mainContent = document.getElementById("app-main-content");
    const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
    const btnThemeToggle = document.getElementById("btn-theme-toggle");
    
    const navButtons = document.querySelectorAll(".nav-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    
    const loadingOverlay = document.getElementById("global-loading");
    const loadingMsg = document.getElementById("loading-msg");
    
    // -------------------------------------------------------------
    // 2. Sidebar Collapse Feature (with LocalStorage persistence)
    // -------------------------------------------------------------
    const isSidebarCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
    if (isSidebarCollapsed) {
        sidebar.classList.add("collapsed");
        mainContent.classList.add("sidebar-collapsed");
    }

    btnToggleSidebar.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        mainContent.classList.toggle("sidebar-collapsed");
        localStorage.setItem("sidebar_collapsed", sidebar.classList.contains("collapsed"));
    });

    // -------------------------------------------------------------
    // 3. Theme Switcher (Light/Dark Mode with LocalStorage persistence)
    // -------------------------------------------------------------
    const currentTheme = localStorage.getItem("theme") || "light";
    if (currentTheme === "dark") {
        document.body.classList.add("dark-mode");
        btnThemeToggle.innerHTML = "☀️ Light Mode";
    } else {
        document.body.classList.remove("dark-mode");
        btnThemeToggle.innerHTML = "🌙 Dark Mode";
    }

    btnThemeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        const theme = document.body.classList.contains("dark-mode") ? "dark" : "light";
        localStorage.setItem("theme", theme);
        btnThemeToggle.innerHTML = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
        showToast(`Switched to ${theme} mode`, "success", "Theme Updated");
    });

    // -------------------------------------------------------------
    // 4. Tab Navigation Logic
    // -------------------------------------------------------------
    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            switchTab(tabId);
        });
    });

    function switchTab(tabId) {
        // Toggle nav buttons active class
        navButtons.forEach(b => {
            if (b.getAttribute("data-tab") === tabId) {
                b.classList.add("active");
            } else {
                b.classList.remove("active");
            }
        });
        
        // Toggle tab panels
        tabContents.forEach(tc => {
            if (tc.id === `tab-${tabId}`) {
                tc.classList.add("active");
            } else {
                tc.classList.remove("active");
            }
        });
    }

    // -------------------------------------------------------------
    // 5. Activity History Manager (with LocalStorage cache)
    // -------------------------------------------------------------
    const historyList = document.getElementById("history-list");
    const btnClearHistory = document.getElementById("btn-clear-history");

    function getHistory() {
        try {
            return JSON.parse(localStorage.getItem("edugenie_history")) || [];
        } catch (e) {
            return [];
        }
    }

    function saveToHistory(type, title, data) {
        const history = getHistory();
        // Remove item if it exists with same title to avoid duplicates
        const filteredHistory = history.filter(item => item.title !== title);
        
        // Prepend new history record
        filteredHistory.unshift({
            id: Date.now(),
            type: type,
            title: title,
            data: data,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        
        // Limit history list to 25 items
        const limitedHistory = filteredHistory.slice(0, 25);
        localStorage.setItem("edugenie_history", JSON.stringify(limitedHistory));
        renderHistory();
    }

    function renderHistory() {
        const history = getHistory();
        historyList.innerHTML = "";
        
        if (history.length === 0) {
            historyList.innerHTML = `<div class="history-empty">No recent activity</div>`;
            return;
        }

        const icons = {
            qa: "❓",
            explain: "💡",
            quiz: "📝",
            summarize: "📄",
            roadmap: "🛣️"
        };

        history.forEach(item => {
            const div = document.createElement("div");
            div.className = "history-item";
            div.setAttribute("data-id", item.id);
            div.title = `${item.title} (${item.timestamp})`;
            
            div.innerHTML = `
                <span class="history-item-icon">${icons[item.type] || "✨"}</span>
                <span class="history-item-title">${item.title}</span>
            `;
            
            div.addEventListener("click", () => loadHistoryItem(item));
            historyList.appendChild(div);
        });
    }

    function loadHistoryItem(item) {
        switchTab(item.type);
        showToast("Loaded entry from history!", "success", "History");

        if (item.type === "qa") {
            document.getElementById("qa-question").value = item.title;
            const resCard = document.getElementById("result-qa-card");
            const resText = document.getElementById("result-qa-text");
            const badge = document.getElementById("qa-badge");
            
            resText.innerHTML = parseMarkdown(item.data.answer);
            badge.innerText = item.data.model_used;
            resCard.classList.remove("hidden");
        } 
        else if (item.type === "explain") {
            document.getElementById("explain-concept").value = item.data.concept;
            document.getElementById("explain-level").value = item.data.level;
            const resCard = document.getElementById("result-explain-card");
            const resText = document.getElementById("result-explain-text");
            const titleDisplay = document.getElementById("explain-title-display");
            
            titleDisplay.innerText = item.data.concept;
            resText.innerHTML = parseMarkdown(item.data.explanation);
            resCard.classList.remove("hidden");
        }
        else if (item.type === "summarize") {
            document.getElementById("summarize-text").value = item.title;
            const resCard = document.getElementById("result-summarize-card");
            const resText = document.getElementById("result-summarize-text");
            
            resText.innerHTML = parseMarkdown(item.data.summary);
            resCard.classList.remove("hidden");
        }
        else if (item.type === "roadmap") {
            document.getElementById("roadmap-topic").value = item.data.topic;
            document.getElementById("roadmap-level").value = item.data.level;
            const resCard = document.getElementById("result-roadmap-card");
            const resText = document.getElementById("result-roadmap-text");
            const titleDisplay = document.getElementById("roadmap-title-display");
            
            titleDisplay.innerText = `${item.data.topic} (${item.data.level})`;
            resText.innerHTML = parseMarkdown(item.data.roadmap);
            resCard.classList.remove("hidden");
        }
        else if (item.type === "quiz") {
            // Restore quiz generation form state
            document.getElementById("quiz-topic").value = item.title;
            
            // Re-initialize quiz using cached questions
            quizQuestions = item.data.questions;
            currentQIndex = 0;
            quizScore = 0;
            
            document.getElementById("quiz-title").innerText = `Quiz: ${item.data.topic} (${item.data.difficulty})`;
            
            // Toggle view to player
            document.getElementById("quiz-gen-card").classList.add("hidden");
            document.getElementById("quiz-score-card").classList.add("hidden");
            document.getElementById("quiz-play-card").classList.remove("hidden");
            
            loadQuestion(0);
        }
    }

    btnClearHistory.addEventListener("click", () => {
        if (confirm("Are you sure you want to clear your entire activity history?")) {
            localStorage.removeItem("edugenie_history");
            renderHistory();
            showToast("Activity history cleared.", "success", "Cleared");
        }
    });

    // Initial history rendering
    renderHistory();

    // -------------------------------------------------------------
    // 6. Copy to Clipboard Utility
    // -------------------------------------------------------------
    const copyButtons = document.querySelectorAll(".copy-btn");
    copyButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target");
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                navigator.clipboard.writeText(targetEl.innerText).then(() => {
                    const originalText = btn.innerText;
                    btn.innerText = "✓";
                    btn.style.color = "var(--success)";
                    setTimeout(() => {
                        btn.innerText = originalText;
                        btn.style.color = "var(--text-secondary)";
                    }, 2000);
                    showToast("Copied response to clipboard!", "success", "Copied");
                });
            }
        });
    });

    // -------------------------------------------------------------
    // 7. Custom Toast Alerts Utility
    // -------------------------------------------------------------
    function showToast(message, type = "error", title = "Error") {
        const container = document.getElementById("toast-container");
        if (!container) return;
        
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        
        const icon = type === "error" ? "❌" : "✨";
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = "toastFadeOut 0.3s forwards";
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    // -------------------------------------------------------------
    // 8. Markdown Parsing Utility
    // -------------------------------------------------------------
    function parseMarkdown(text) {
        if (!text) return "";
        try {
            return marked.parse(text);
        } catch (e) {
            console.error("Markdown parsing failed, using fallback:", e);
            return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
        }
    }

    // -------------------------------------------------------------
    // 9. Spinner Loading Overlay Controls
    // -------------------------------------------------------------
    function showLoading(msg = "EduGenie is thinking...") {
        loadingMsg.innerText = msg;
        loadingOverlay.classList.remove("hidden");
    }

    function hideLoading() {
        loadingOverlay.classList.add("hidden");
    }

    // -------------------------------------------------------------
    // 10. Status Tracker checks
    // -------------------------------------------------------------
    async function checkBackendStatus() {
        try {
            const res = await fetch("/api/status");
            if (res.ok) {
                const status = await res.json();
                
                // Update Gemini Dot and Label
                const geminiDot = document.getElementById("status-gemini-dot");
                const geminiText = document.getElementById("status-gemini-text");
                const apiAlert = document.getElementById("api-alert");
                
                if (status.gemini_active) {
                    geminiDot.className = "status-dot active";
                    geminiText.innerText = "Active (Cloud)";
                    if (apiAlert) apiAlert.classList.add("hidden");
                } else {
                    geminiDot.className = "status-dot inactive";
                    geminiText.innerText = "Inactive";
                }

                // Update Local T5 Dot and Label
                const localDot = document.getElementById("status-local-dot");
                const localText = document.getElementById("status-local-text");
                if (status.local_model_loaded) {
                    localDot.className = "status-dot active";
                    localText.innerText = "Loaded (Ready)";
                } else {
                    localDot.className = "status-dot inactive";
                    localText.innerText = "Idle (Unloaded)";
                }
            }
        } catch (e) {
            console.error("Failed to fetch backend status:", e);
        }
    }

    // Check status immediately on load
    checkBackendStatus();

    // -------------------------------------------------------------
    // 11. Form Formulations & API Integrations
    // -------------------------------------------------------------

    // Q&A Submission
    const formQA = document.getElementById("form-qa");
    const resultQA = document.getElementById("result-qa-card");
    const resultQAText = document.getElementById("result-qa-text");
    const qaBadge = document.getElementById("qa-badge");

    formQA.addEventListener("submit", async (e) => {
        e.preventDefault();
        const question = document.getElementById("qa-question").value;
        const useLocal = document.getElementById("qa-local").checked;

        const isLocalActive = useLocal || !document.getElementById("status-gemini-dot").classList.contains("active");
        
        const localDot = document.getElementById("status-local-dot");
        const localText = document.getElementById("status-local-text");
        if (isLocalActive && !localDot.classList.contains("active")) {
            localDot.className = "status-dot loading";
            localText.innerText = "Downloading...";
        }

        showLoading(isLocalActive ? "Inference using local model..." : "Querying Gemini API...");

        try {
            const response = await fetch("/api/qa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question, use_local: useLocal })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Failed to query QA endpoint.");
            }

            const data = await response.json();
            resultQAText.innerHTML = parseMarkdown(data.answer);
            qaBadge.innerText = data.model_used;
            resultQA.classList.remove("hidden");
            
            showToast("Question answered successfully!", "success", "Response Ready");
            saveToHistory("qa", question, data);
            checkBackendStatus();
        } catch (err) {
            showToast(err.message, "error", "Operation Failed");
        } finally {
            hideLoading();
        }
    });

    // Concept Explainer Submission
    const formExplain = document.getElementById("form-explain");
    const resultExplain = document.getElementById("result-explain-card");
    const resultExplainText = document.getElementById("result-explain-text");
    const explainTitleDisplay = document.getElementById("explain-title-display");

    formExplain.addEventListener("submit", async (e) => {
        e.preventDefault();
        const concept = document.getElementById("explain-concept").value;
        const level = document.getElementById("explain-level").value;

        showLoading(`Explaining "${concept}" for ${level} level...`);

        try {
            const response = await fetch("/api/explain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ concept, level })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Failed to explain concept.");
            }

            const data = await response.json();
            explainTitleDisplay.innerText = data.concept;
            resultExplainText.innerHTML = parseMarkdown(data.explanation);
            resultExplain.classList.remove("hidden");
            
            showToast("Concept explained successfully!", "success", "Explanation Ready");
            saveToHistory("explain", concept, data);
        } catch (err) {
            showToast(err.message, "error", "Operation Failed");
        } finally {
            hideLoading();
        }
    });

    // Quiz Generation Submission
    const formQuiz = document.getElementById("form-quiz");
    const quizGenCard = document.getElementById("quiz-gen-card");
    const quizPlayCard = document.getElementById("quiz-play-card");
    const quizScoreCard = document.getElementById("quiz-score-card");
    
    let quizQuestions = [];
    let currentQIndex = 0;
    let quizScore = 0;
    let questionAnswered = false;

    formQuiz.addEventListener("submit", async (e) => {
        e.preventDefault();
        const topic = document.getElementById("quiz-topic").value;
        const numQ = parseInt(document.getElementById("quiz-num").value);
        const difficulty = document.getElementById("quiz-difficulty").value;

        showLoading("Generating interactive quiz questions...");

        try {
            const response = await fetch("/api/quiz", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic, num_questions: numQ, difficulty })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Failed to generate quiz.");
            }

            const data = await response.json();
            quizQuestions = data.questions;
            
            currentQIndex = 0;
            quizScore = 0;
            
            document.getElementById("quiz-title").innerText = `Quiz: ${data.topic} (${data.difficulty})`;
            
            quizGenCard.classList.add("hidden");
            quizPlayCard.classList.remove("hidden");
            quizScoreCard.classList.add("hidden");
            
            loadQuestion(0);
            showToast("Quiz generated! Answer the questions below.", "success", "Quiz Ready");
            saveToHistory("quiz", topic, data);
        } catch (err) {
            showToast(err.message, "error", "Operation Failed");
        } finally {
            hideLoading();
        }
    });

    function loadQuestion(index) {
        questionAnswered = false;
        const question = quizQuestions[index];
        
        const progressPercentage = (index / quizQuestions.length) * 100;
        document.getElementById("quiz-progress-fill").style.width = `${progressPercentage}%`;
        document.getElementById("quiz-tracker").innerText = `Question ${index + 1} of ${quizQuestions.length}`;
        
        document.getElementById("quiz-q-text").innerText = question.question;
        
        const optionsList = document.getElementById("quiz-options-list");
        optionsList.innerHTML = "";
        
        const markers = ["A", "B", "C", "D"];
        question.options.forEach((optText, optIdx) => {
            const card = document.createElement("div");
            card.className = "quiz-option-card";
            card.setAttribute("data-index", optIdx);
            
            card.innerHTML = `
                <div class="option-marker">${markers[optIdx]}</div>
                <div class="option-text">${optText}</div>
            `;
            
            card.addEventListener("click", () => handleOptionClick(optIdx));
            optionsList.appendChild(card);
        });

        const feedbackBox = document.getElementById("quiz-feedback-box");
        feedbackBox.className = "quiz-feedback hidden";
        
        const nextBtn = document.getElementById("btn-quiz-next");
        nextBtn.innerText = index === quizQuestions.length - 1 ? "Finish Quiz" : "Next Question";
        nextBtn.setAttribute("disabled", "true");
    }

    function handleOptionClick(selectedIdx) {
        if (questionAnswered) return;
        questionAnswered = true;

        const currentQ = quizQuestions[currentQIndex];
        const correctIdx = currentQ.correct_option;
        const optionsList = document.getElementById("quiz-options-list");
        const cards = optionsList.querySelectorAll(".quiz-option-card");
        
        cards.forEach((card) => {
            const cardIdx = parseInt(card.getAttribute("data-index"));
            if (cardIdx === correctIdx) {
                card.classList.add("correct");
            } else if (cardIdx === selectedIdx) {
                card.classList.add("incorrect");
            }
        });

        const feedbackBox = document.getElementById("quiz-feedback-box");
        const feedbackStatus = document.getElementById("quiz-feedback-status");
        const feedbackExpl = document.getElementById("quiz-feedback-explanation");
        
        if (selectedIdx === correctIdx) {
            quizScore++;
            feedbackBox.className = "quiz-feedback correct-feedback";
            feedbackStatus.innerText = "✓ Correct!";
            feedbackStatus.style.color = "var(--success)";
            feedbackBox.style.borderLeftColor = "var(--success)";
        } else {
            feedbackBox.className = "quiz-feedback incorrect-feedback";
            feedbackStatus.innerText = "✗ Incorrect";
            feedbackStatus.style.color = "var(--error)";
            feedbackBox.style.borderLeftColor = "var(--error)";
        }
        
        feedbackExpl.innerText = currentQ.explanation;
        feedbackBox.classList.remove("hidden");

        document.getElementById("btn-quiz-next").removeAttribute("disabled");
    }

    const btnNext = document.getElementById("btn-quiz-next");
    btnNext.addEventListener("click", () => {
        currentQIndex++;
        if (currentQIndex < quizQuestions.length) {
            loadQuestion(currentQIndex);
        } else {
            quizPlayCard.classList.add("hidden");
            quizScoreCard.classList.remove("hidden");
            
            document.getElementById("quiz-progress-fill").style.width = "100%";
            document.getElementById("score-display").innerText = `${quizScore}/${quizQuestions.length}`;
            
            const pct = (quizScore / quizQuestions.length) * 100;
            let summaryMsg = "";
            if (pct === 100) {
                summaryMsg = `Incredible! You got a perfect score. You've fully mastered this topic! 🌟`;
            } else if (pct >= 70) {
                summaryMsg = `Great job! You answered ${quizScore} out of ${quizQuestions.length} questions correctly. 👍`;
            } else if (pct >= 40) {
                summaryMsg = `Nice attempt. You got ${quizScore} out of ${quizQuestions.length} correct. Review explanations and retry! 📚`;
            } else {
                summaryMsg = `You scored ${quizScore} out of ${quizQuestions.length}. Review the concept and try again! 💪`;
            }
            document.getElementById("score-summary-text").innerText = summaryMsg;
            showToast("Quiz completed! View summary.", "success", "Finished");
        }
    });

    const exitQuiz = () => {
        if (confirm("Are you sure you want to exit the quiz? Your progress will be lost.")) {
            quizPlayCard.classList.add("hidden");
            quizGenCard.classList.remove("hidden");
        }
    };
    
    document.getElementById("btn-quiz-exit").addEventListener("click", exitQuiz);
    
    document.getElementById("btn-quiz-finish").addEventListener("click", () => {
        quizScoreCard.classList.add("hidden");
        quizGenCard.classList.remove("hidden");
    });

    document.getElementById("btn-quiz-retry").addEventListener("click", () => {
        quizScoreCard.classList.add("hidden");
        quizPlayCard.classList.remove("hidden");
        currentQIndex = 0;
        quizScore = 0;
        loadQuestion(0);
    });

    // Text Summarization Submission
    const formSummarize = document.getElementById("form-summarize");
    const resultSummarize = document.getElementById("result-summarize-card");
    const resultSummarizeText = document.getElementById("result-summarize-text");

    formSummarize.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = document.getElementById("summarize-text").value;
        const maxLen = parseInt(document.getElementById("summarize-len").value);

        const isLocalActive = !document.getElementById("status-gemini-dot").classList.contains("active");
        
        const localDot = document.getElementById("status-local-dot");
        const localText = document.getElementById("status-local-text");
        if (isLocalActive && !localDot.classList.contains("active")) {
            localDot.className = "status-dot loading";
            localText.innerText = "Downloading...";
        }

        showLoading(isLocalActive ? "Summarizing text locally using T5..." : "Summarizing text using Gemini API...");

        try {
            const response = await fetch("/api/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, max_length: maxLen })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Failed to summarize text.");
            }

            const data = await response.json();
            resultSummarizeText.innerHTML = parseMarkdown(data.summary);
            resultSummarize.classList.remove("hidden");
            
            showToast("Summary created successfully!", "success", "Summary Ready");
            
            // Truncate text for title
            const truncatedTitle = text.length > 30 ? text.substring(0, 30) + "..." : text;
            saveToHistory("summarize", truncatedTitle, data);
            checkBackendStatus();
        } catch (err) {
            showToast(err.message, "error", "Operation Failed");
        } finally {
            hideLoading();
        }
    });

    // Roadmap Generation Submission
    const formRoadmap = document.getElementById("form-roadmap");
    const resultRoadmap = document.getElementById("result-roadmap-card");
    const resultRoadmapText = document.getElementById("result-roadmap-text");
    const roadmapTitleDisplay = document.getElementById("roadmap-title-display");

    formRoadmap.addEventListener("submit", async (e) => {
        e.preventDefault();
        const topic = document.getElementById("roadmap-topic").value;
        const level = document.getElementById("roadmap-level").value;

        showLoading(`Creating custom roadmap for "${topic}" (${level})...`);

        try {
            const response = await fetch("/api/recommend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic, level })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Failed to generate learning roadmap.");
            }

            const data = await response.json();
            roadmapTitleDisplay.innerText = `${data.topic} (${data.level})`;
            resultRoadmapText.innerHTML = parseMarkdown(data.roadmap);
            resultRoadmap.classList.remove("hidden");
            
            showToast("Roadmap generated successfully!", "success", "Roadmap Ready");
            saveToHistory("roadmap", topic, data);
        } catch (err) {
            showToast(err.message, "error", "Operation Failed");
        } finally {
            hideLoading();
        }
    });
});
