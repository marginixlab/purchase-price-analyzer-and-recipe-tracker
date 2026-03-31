(function () {
    const STORAGE_KEY = "priceAnalyzerGuideWorkspace";
    const MAX_HISTORY = 8;

    function getElements() {
        return {
            workspace: document.getElementById("guideWorkspace"),
            form: document.getElementById("guideAskForm"),
            input: document.getElementById("guideAskInput"),
            button: document.getElementById("guideAskButton"),
            answer: document.getElementById("guideAskAnswer"),
            emptyState: document.getElementById("guideAskEmptyState"),
            answerTitle: document.getElementById("guideAskAnswerTitle"),
            answerText: document.getElementById("guideAskAnswerText"),
            answerMeta: document.getElementById("guideAskAnswerMeta"),
            relatedSection: document.getElementById("guideAskRelatedSection"),
            nextStep: document.getElementById("guideAskNextStep"),
            contextNote: document.getElementById("guideAskContextNote"),
            contextChip: document.getElementById("guideAskContextChip"),
            workflowBlock: document.getElementById("guideAskWorkflowBlock"),
            workflow: document.getElementById("guideAskWorkflow"),
            actions: document.getElementById("guideAskActions"),
            historyList: document.getElementById("guideHistoryList"),
            historyEmpty: document.getElementById("guideHistoryEmpty"),
            historyClearButton: document.getElementById("guideHistoryClearButton"),
            topicButtons: Array.from(document.querySelectorAll("[data-guide-question]"))
        };
    }

    function readState() {
        try {
            const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
            return {
                currentQuestion: typeof parsed.currentQuestion === "string" ? parsed.currentQuestion : "",
                currentAnswer: parsed.currentAnswer && typeof parsed.currentAnswer === "object" ? parsed.currentAnswer : null,
                selectedTopic: typeof parsed.selectedTopic === "string" ? parsed.selectedTopic : "",
                history: Array.isArray(parsed.history) ? parsed.history.slice(0, MAX_HISTORY) : []
            };
        } catch (error) {
            return { currentQuestion: "", currentAnswer: null, selectedTopic: "", history: [] };
        }
    }

    function writeState(state) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            return;
        }
    }

    function normalizeQuestion(value) {
        return String(value || "").trim().toLowerCase();
    }

    function setActiveTopic(elements, topicId) {
        elements.topicButtons.forEach((button) => {
            button.classList.toggle("is-active", button.dataset.guideTopic === topicId && Boolean(topicId));
        });
    }

    function renderActions(elements, actions) {
        if (!elements.actions) return;
        elements.actions.innerHTML = "";
        const validActions = Array.isArray(actions) ? actions.filter((item) => item && item.href && item.label) : [];
        elements.actions.hidden = validActions.length === 0;
        validActions.forEach((action) => {
            const link = document.createElement("a");
            link.className = "guide-action-link";
            link.href = action.href;
            link.textContent = action.label;
            elements.actions.appendChild(link);
        });
    }

    function renderWorkflow(elements, workflowSteps) {
        if (!elements.workflow || !elements.workflowBlock) return;
        elements.workflow.innerHTML = "";
        const steps = Array.isArray(workflowSteps) ? workflowSteps.filter(Boolean) : [];
        elements.workflowBlock.hidden = steps.length === 0;

        steps.forEach((step, index) => {
            const item = document.createElement("div");
            item.className = "guide-answer-step";

            const badge = document.createElement("div");
            badge.className = "guide-answer-step-index";
            badge.textContent = String(index + 1).padStart(2, "0");

            const text = document.createElement("div");
            text.className = "guide-answer-step-text";
            text.textContent = step;

            item.appendChild(badge);
            item.appendChild(text);
            elements.workflow.appendChild(item);
        });
    }

    function renderAnswer(elements, payload) {
        if (!elements.answer || !elements.answerText) return;

        elements.answer.hidden = false;
        if (elements.emptyState) {
            elements.emptyState.hidden = true;
        }

        if (elements.answerTitle) {
            elements.answerTitle.textContent = payload.title || "Guide Answer";
        }
        elements.answerText.textContent = payload.answer || "I couldn't find that feature in this tool yet.";

        const relatedSection = payload.related_section ? `Related section: ${payload.related_section}` : "";
        const nextStep = payload.next_step ? `Next step: ${payload.next_step}` : "";
        const contextNote = payload.context_note ? String(payload.context_note) : "";

        if (elements.relatedSection) {
            elements.relatedSection.textContent = relatedSection;
            elements.relatedSection.hidden = !relatedSection;
        }

        if (elements.nextStep) {
            elements.nextStep.textContent = nextStep;
            elements.nextStep.hidden = !nextStep;
        }

        if (elements.answerMeta) {
            elements.answerMeta.hidden = !relatedSection && !nextStep;
        }

        if (elements.contextNote) {
            elements.contextNote.textContent = contextNote;
            elements.contextNote.hidden = !contextNote;
        }

        if (elements.contextChip) {
            elements.contextChip.hidden = !(payload.context_available || contextNote);
        }

        renderWorkflow(elements, payload.workflow_steps);
        renderActions(elements, payload.actions);
    }

    function renderEmptyState(elements) {
        if (elements.answer) {
            elements.answer.hidden = true;
        }
        if (elements.emptyState) {
            elements.emptyState.hidden = false;
        }
    }

    function renderHistory(elements, state) {
        if (!elements.historyList || !elements.historyEmpty) return;
        elements.historyList.innerHTML = "";
        const items = Array.isArray(state.history) ? state.history : [];
        elements.historyEmpty.hidden = items.length > 0;
        if (elements.historyClearButton) {
            elements.historyClearButton.hidden = items.length === 0;
        }

        items.forEach((entry, index) => {
            const item = document.createElement("div");
            item.className = "guide-history-item";

            const button = document.createElement("button");
            button.type = "button";
            button.className = "guide-history-button";
            button.textContent = entry.question;
            button.dataset.question = entry.question;
            button.addEventListener("click", () => {
                if (elements.input) {
                    elements.input.value = entry.question;
                }
                if (entry.topic) {
                    setActiveTopic(elements, entry.topic);
                }
                if (entry.payload) {
                    renderAnswer(elements, entry.payload);
                    const nextState = readState();
                    nextState.currentQuestion = entry.question;
                    nextState.currentAnswer = entry.payload;
                    nextState.selectedTopic = entry.topic || "";
                    writeState(nextState);
                }
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "guide-history-delete";
            deleteButton.setAttribute("aria-label", `Delete saved question ${entry.question}`);
            deleteButton.textContent = "×";
            deleteButton.addEventListener("click", () => {
                const nextState = readState();
                nextState.history = nextState.history.filter((_, entryIndex) => entryIndex !== index);
                if (normalizeQuestion(nextState.currentQuestion) === normalizeQuestion(entry.question)) {
                    nextState.currentQuestion = "";
                    nextState.currentAnswer = null;
                    nextState.selectedTopic = "";
                    if (elements.input) {
                        elements.input.value = "";
                    }
                    renderEmptyState(elements);
                    setActiveTopic(elements, "");
                }
                writeState(nextState);
                renderHistory(elements, nextState);
            });

            item.appendChild(button);
            item.appendChild(deleteButton);
            elements.historyList.appendChild(item);
        });
    }

    function persistAnswer(state, question, payload, topicId) {
        const normalized = normalizeQuestion(question);
        const nextHistory = [
            { question, payload, topic: topicId || "" },
            ...state.history.filter((entry) => normalizeQuestion(entry.question) !== normalized)
        ].slice(0, MAX_HISTORY);

        const nextState = {
            currentQuestion: question,
            currentAnswer: payload,
            selectedTopic: topicId || "",
            history: nextHistory
        };
        writeState(nextState);
        return nextState;
    }

    async function askGuide(question, elements, topicId) {
        if (!elements.button) return;
        elements.button.disabled = true;

        try {
            const response = await fetch("/guide/ask", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: JSON.stringify({ question })
            });

            const payload = await response.json();
            if (!response.ok || payload.success !== true) {
                throw new Error(payload.message || "I couldn't find that feature in this tool yet.");
            }

            renderAnswer(elements, payload);
            const state = persistAnswer(readState(), question, payload, topicId);
            renderHistory(elements, state);
            setActiveTopic(elements, topicId || "");
        } catch (error) {
            const fallbackPayload = {
                title: "Guide Assistant",
                answer: error.message || "I couldn't find that feature in this tool yet.",
                related_section: null,
                next_step: null,
                context_note: null,
                workflow_steps: [],
                actions: [],
                context_available: false
            };
            renderAnswer(elements, fallbackPayload);
            const state = persistAnswer(readState(), question, fallbackPayload, topicId);
            renderHistory(elements, state);
            setActiveTopic(elements, topicId || "");
        } finally {
            elements.button.disabled = false;
        }
    }

    function hydrateFromStorage(elements) {
        const state = readState();
        if (elements.input && state.currentQuestion) {
            elements.input.value = state.currentQuestion;
        }
        setActiveTopic(elements, state.selectedTopic);
        renderHistory(elements, state);
        if (state.currentAnswer) {
            renderAnswer(elements, state.currentAnswer);
        } else {
            renderEmptyState(elements);
        }
    }

    function bindEvents(elements) {
        if (elements.form && elements.input) {
            elements.form.addEventListener("submit", (event) => {
                event.preventDefault();
                const question = String(elements.input.value || "").trim();
                if (!question) {
                    renderAnswer(elements, {
                        title: "Guide Assistant",
                        answer: "Enter a product-help question first.",
                        related_section: null,
                        next_step: null,
                        context_note: null,
                        workflow_steps: [],
                        actions: [],
                        context_available: false
                    });
                    return;
                }
                const currentTopic = readState().selectedTopic || "";
                askGuide(question, elements, currentTopic);
            });
        }

        elements.topicButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const question = String(button.dataset.guideQuestion || "").trim();
                const topicId = String(button.dataset.guideTopic || "").trim();
                if (!question) return;
                if (elements.input) {
                    elements.input.value = question;
                }
                const state = readState();
                state.selectedTopic = topicId;
                writeState(state);
                setActiveTopic(elements, topicId);
                askGuide(question, elements, topicId);
            });
        });

        if (elements.historyClearButton) {
            elements.historyClearButton.addEventListener("click", () => {
                if (!window.confirm("Clear all saved Guide questions?")) {
                    return;
                }
                const nextState = {
                    currentQuestion: "",
                    currentAnswer: null,
                    selectedTopic: "",
                    history: []
                };
                writeState(nextState);
                if (elements.input) {
                    elements.input.value = "";
                }
                setActiveTopic(elements, "");
                renderHistory(elements, nextState);
                renderEmptyState(elements);
            });
        }
    }

    const elements = getElements();
    if (!elements.workspace) {
        return;
    }

    hydrateFromStorage(elements);
    bindEvents(elements);
})();
