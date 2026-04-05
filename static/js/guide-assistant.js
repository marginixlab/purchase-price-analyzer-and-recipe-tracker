(function () {
    const STORAGE_KEY = "priceAnalyzerGuideWorkspace";
    const QUOTE_COMPARE_STATE_KEY = "quote_compare_state_v1";
    const MAX_HISTORY = 8;

    function getElements() {
        return {
            workspace: document.getElementById("guideWorkspace"),
            assistantShell: document.querySelector("#guideWorkspaceView .guide-assistant-shell") || document.querySelector("#guideWorkspace .guide-assistant-shell"),
            resultStage: document.getElementById("guideResultStage"),
            form: document.getElementById("guideAskForm"),
            input: document.getElementById("guideAskInput"),
            button: document.getElementById("guideAskButton"),
            answer: document.getElementById("guideAskAnswer"),
            answerBody: document.getElementById("guideAskAnswerBody"),
            emptyState: document.getElementById("guideAskEmptyState"),
            answerTitle: document.getElementById("guideAskAnswerTitle"),
            answerText: document.getElementById("guideAskAnswerText"),
            answerMeta: document.getElementById("guideAskAnswerMeta"),
            relatedSection: document.getElementById("guideAskRelatedSection"),
            nextStep: document.getElementById("guideAskNextStep"),
            contextNote: document.getElementById("guideAskContextNote"),
            contextChip: document.getElementById("guideAskContextChip"),
            whyBlock: document.getElementById("guideAskWhyBlock"),
            whyText: document.getElementById("guideAskWhyText"),
            workflowBlock: document.getElementById("guideAskWorkflowBlock"),
            workflow: document.getElementById("guideAskWorkflow"),
            snapshotBlock: document.getElementById("guideAskSnapshotBlock"),
            snapshot: document.getElementById("guideAskSnapshot"),
            actions: document.getElementById("guideAskActions"),
            historyList: document.getElementById("guideHistoryList"),
            historyEmpty: document.getElementById("guideHistoryEmpty"),
            historyClearButton: document.getElementById("guideHistoryClearButton"),
            topicButtons: Array.from(document.querySelectorAll("[data-guide-question]")),
            contextStatus: document.getElementById("guideContextStatus"),
            contextMetrics: document.getElementById("guideContextMetrics"),
            contextHints: document.getElementById("guideContextHints")
        };
    }

    function readQuoteCompareSnapshot() {
        try {
            const parsed = JSON.parse(window.sessionStorage.getItem(QUOTE_COMPARE_STATE_KEY) || "null");
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function buildGuideContextModel() {
        return {
            status: "Guide answers product-use questions and does not inspect your uploaded dataset.",
            metrics: [
                { label: "Guide Mode", value: "Usage Only", tone: "accent" },
                { label: "Best For", value: "Workflows", tone: "default" },
                { label: "Answers", value: "How-To", tone: "default" },
                { label: "Focus", value: "Product Help", tone: "default" }
            ],
            hints: [
                "Ask what a screen is for, how to complete a workflow, or how to interpret a view correctly.",
                "Guide explains process and product behavior. It does not summarize suppliers, products, savings, or other dataset findings.",
                "Use Compare Prices or Recipes for hands-on work, and use Guide when you want orientation or product help."
            ]
        };
    }

    function renderGuideContext(elements, model) {
        if (elements.contextStatus) {
            elements.contextStatus.textContent = model.status;
        }
        if (elements.contextMetrics) {
            elements.contextMetrics.innerHTML = model.metrics.map((metric) => `
                <article class="guide-context-metric ${metric.tone === "accent" ? "is-accent" : ""}">
                    <div class="guide-context-metric-value">${metric.value}</div>
                    <div class="guide-context-metric-label">${metric.label}</div>
                </article>
            `).join("");
        }
        if (elements.contextHints) {
            elements.contextHints.innerHTML = model.hints.map((hint) => `<div class="guide-context-hint">${hint}</div>`).join("");
        }
    }

    async function refreshGuideContext(elements) {
        if (!elements.workspace || (!elements.contextStatus && !elements.contextMetrics && !elements.contextHints)) return;
        renderGuideContext(elements, buildGuideContextModel());
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

    function setAnswerState(elements, hasAnswer) {
        if (!elements.assistantShell) return;
        elements.assistantShell.classList.toggle("has-answer", Boolean(hasAnswer));
        elements.assistantShell.classList.toggle("is-empty", !hasAnswer);
    }

    function setResultState(elements, hasGuideAnswer, hasWorkflow) {
        if (elements.resultStage) {
            elements.resultStage.classList.toggle("guide-result-ready", Boolean(hasGuideAnswer));
            elements.resultStage.classList.toggle("guide-result-empty", !hasGuideAnswer);
        }
        if (elements.answer) {
            elements.answer.hidden = !hasGuideAnswer;
        }
        if (elements.answerBody) {
            elements.answerBody.hidden = !hasGuideAnswer;
        }
        if (elements.emptyState) {
            elements.emptyState.hidden = hasGuideAnswer;
        }
        if (elements.workflowBlock) {
            elements.workflowBlock.hidden = !(hasGuideAnswer && hasWorkflow);
        }
        setAnswerState(elements, hasGuideAnswer);
    }

    function clearGuideState() {
        try {
            window.localStorage.removeItem(STORAGE_KEY);
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

    function findDefaultTopicButton(elements) {
        return elements.topicButtons.find((button) => (
            String(button.dataset.guideQuestion || "").trim() === "What should I do first?"
        )) || null;
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

    function renderSnapshot(elements, snapshotLines) {
        if (!elements.snapshotBlock || !elements.snapshot) return;
        elements.snapshot.innerHTML = "";
        const lines = Array.isArray(snapshotLines) ? snapshotLines.filter((item) => item && item.label && item.value) : [];
        elements.snapshotBlock.hidden = lines.length === 0;
        lines.forEach((line) => {
            const item = document.createElement("div");
            item.className = "guide-answer-snapshot-item";

            const label = document.createElement("div");
            label.className = "guide-answer-snapshot-label";
            label.textContent = line.label;

            const value = document.createElement("div");
            value.className = "guide-answer-snapshot-value";
            value.textContent = line.value;

            item.appendChild(label);
            item.appendChild(value);
            elements.snapshot.appendChild(item);
        });
    }

    function renderAnswer(elements, payload) {
        if (!elements.answer || !elements.answerText) return;
        const answerText = String(payload?.answer || "").trim();
        if (!answerText) {
            renderEmptyState(elements);
            return;
        }

        elements.answer.hidden = false;
        if (elements.emptyState) {
            elements.emptyState.hidden = true;
        }

        if (elements.answerTitle) {
            elements.answerTitle.textContent = payload.title || "Guide Answer";
        }
        elements.answerText.textContent = answerText;

        const relatedSection = payload.related_section ? `Related section: ${payload.related_section}` : "";
        const nextStep = payload.next_step ? String(payload.next_step) : "";
        const contextNote = payload.context_note ? String(payload.context_note) : "";
        const whyThisMatters = payload.why_this_matters ? String(payload.why_this_matters) : "";

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
            elements.contextChip.hidden = true;
        }

        if (elements.whyBlock && elements.whyText) {
            elements.whyBlock.hidden = !whyThisMatters;
            elements.whyText.textContent = whyThisMatters;
        }

        renderWorkflow(elements, payload.workflow_steps);
        renderSnapshot(elements, payload.analysis_snapshot);
        renderActions(elements, payload.actions);
        const hasWorkflow = Boolean(elements.workflow?.textContent?.trim());
        setResultState(elements, true, hasWorkflow);
    }

    function renderEmptyState(elements) {
        if (elements.workflowBlock) {
            elements.workflowBlock.hidden = true;
        }
        if (elements.actions) {
            elements.actions.hidden = true;
            elements.actions.innerHTML = "";
        }
        if (elements.answerMeta) {
            elements.answerMeta.hidden = true;
        }
        if (elements.contextNote) {
            elements.contextNote.hidden = true;
            elements.contextNote.textContent = "";
        }
        if (elements.contextChip) {
            elements.contextChip.hidden = true;
        }
        if (elements.whyBlock) {
            elements.whyBlock.hidden = true;
        }
        if (elements.whyText) {
            elements.whyText.textContent = "";
        }
        if (elements.workflow) {
            elements.workflow.innerHTML = "";
        }
        if (elements.snapshotBlock) {
            elements.snapshotBlock.hidden = true;
        }
        if (elements.snapshot) {
            elements.snapshot.innerHTML = "";
        }
        if (elements.answerText) {
            elements.answerText.textContent = "";
        }
        setResultState(elements, false, false);
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
        if (elements.button) {
            elements.button.disabled = true;
        }

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
                answer: error.message || "Guide can help with upload workflow, supplier comparison method, non-comparable rows, Product History, reset behavior, and saved recipe behavior.",
                related_section: null,
                next_step: null,
                context_note: null,
                why_this_matters: null,
                workflow_steps: [],
                analysis_snapshot: [],
                actions: [],
                context_available: false
            };
            renderAnswer(elements, fallbackPayload);
            const state = persistAnswer(readState(), question, fallbackPayload, topicId);
            renderHistory(elements, state);
            setActiveTopic(elements, topicId || "");
        } finally {
            if (elements.button) {
                elements.button.disabled = false;
            }
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
            return;
        }
        const defaultButton = findDefaultTopicButton(elements);
        if (!defaultButton) {
            renderEmptyState(elements);
            return;
        }
        const defaultQuestion = String(defaultButton.dataset.guideQuestion || "").trim();
        const defaultTopicId = String(defaultButton.dataset.guideTopic || "").trim();
        setActiveTopic(elements, defaultTopicId);
        askGuide(defaultQuestion, elements, defaultTopicId);
    }

    function bindEvents(elements) {
        if (elements.form && elements.input) {
            elements.form.addEventListener("submit", (event) => {
                event.preventDefault();
                const question = String(elements.input.value || "").trim();
                if (!question) {
                    renderAnswer(elements, {
                        title: "Guide Assistant",
                        answer: "Enter a question about product workflow, screen purpose, reset behavior, recipes persistence, or how to compare rows correctly.",
                        related_section: null,
                        next_step: null,
                        context_note: null,
                        why_this_matters: null,
                        workflow_steps: [],
                        analysis_snapshot: [],
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

    const hardResetRequested = Boolean(window.PriceAnalyzerBootGuard?.didHardReset?.());
    if (hardResetRequested) {
        clearGuideState();
        if (elements.input) {
            elements.input.value = "";
        }
        setActiveTopic(elements, "");
        renderHistory(elements, { currentQuestion: "", currentAnswer: null, selectedTopic: "", history: [] });
        const defaultButton = findDefaultTopicButton(elements);
        if (defaultButton) {
            askGuide(
                String(defaultButton.dataset.guideQuestion || "").trim(),
                elements,
                String(defaultButton.dataset.guideTopic || "").trim()
            );
        } else {
            renderEmptyState(elements);
        }
    } else {
        hydrateFromStorage(elements);
    }
    bindEvents(elements);
    refreshGuideContext(elements);
    window.addEventListener("focus", () => {
        refreshGuideContext(elements);
    });
    window.addEventListener("pageshow", () => {
        refreshGuideContext(elements);
    });
    window.addEventListener("storage", (event) => {
        if (event.key === QUOTE_COMPARE_STATE_KEY) {
            refreshGuideContext(elements);
        }
    });
})();
