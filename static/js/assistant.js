(function () {
    const presetQuestions = [
        "Which product hurt my margin the most this month?",
        "Which supplier increased prices the fastest?",
        "What should I renegotiate first?",
        "Which products are above yearly average price?",
        "Where am I losing money right now?",
        "What changed this month versus my yearly average?",
        "Which items show unusual price spikes?",
        "Which supplier has the highest pricing risk?"
    ];

    const parseMoney = (value) => parseFloat(String(value || "").replace(/[^0-9.-]/g, "").trim()) || 0;
    const parsePct = (value) => parseFloat(String(value || "").replace(/%/g, "").trim()) || 0;

    function getCellByKey(cells, key, fallbackIndex) {
        return cells.find((cell) => cell.dataset.columnKey === key) || cells[fallbackIndex] || null;
    }

    function getElements() {
        return {
            mainDashboardView: document.getElementById("mainDashboardView"),
            aiWorkspace: document.getElementById("aiWorkspace"),
            askDataPanel: document.getElementById("askDataPanel"),
            aiEntryShell: document.getElementById("aiEntryShell"),
            openAiWorkspaceButton: document.getElementById("openAiWorkspaceButton"),
            closeAiWorkspaceButton: document.getElementById("closeAiWorkspaceButton"),
            aiWorkspaceEntryChip: document.getElementById("aiWorkspaceEntryChip"),
            aiWorkspaceContextChip: document.getElementById("aiWorkspaceContextChip"),
            aiPresetGrid: document.getElementById("aiPresetGrid"),
            aiQuestionForm: document.getElementById("aiQuestionForm"),
            aiQuestionInput: document.getElementById("aiQuestionInput"),
            askAiButton: document.getElementById("askAiButton"),
            aiAnswerState: document.getElementById("aiAnswerState"),
            aiAnswerBody: document.getElementById("aiAnswerBody"),
            aiAnswerHeadline: document.getElementById("aiAnswerHeadline"),
            aiAnswerInsights: document.getElementById("aiAnswerInsights"),
            aiAnswerAction: document.getElementById("aiAnswerAction"),
            aiAnswerPeriod: document.getElementById("aiAnswerPeriod"),
            aiAnswerSource: document.getElementById("aiAnswerSource"),
            aiFollowupRow: document.getElementById("aiFollowupRow"),
            tableBody: document.getElementById("resultsTableBody")
        };
    }

    function hasAnalyzedDataset(elements, rowCount) {
        const flaggedAnalysis = elements.mainDashboardView?.dataset.hasAnalysis === "true";
        return flaggedAnalysis || rowCount > 0;
    }

    function getVisibleRows(elements) {
        if (!elements.tableBody) {
            return [];
        }

        return Array.from(elements.tableBody.querySelectorAll("tr")).map((tr) => {
            const cells = Array.from(tr.querySelectorAll("td"));
            return {
                productName: getCellByKey(cells, "productName", 0)?.innerText.trim() || "",
                supplier: tr.dataset.supplier || "",
                purchaseUnit: getCellByKey(cells, "purchaseUnit", 2)?.innerText.trim() || "",
                quantity: Number(getCellByKey(cells, "quantity", 3)?.innerText.trim()) || 0,
                unitPrice: parseMoney(getCellByKey(cells, "unitPrice", 4)?.innerText),
                totalAmount: parseMoney(getCellByKey(cells, "totalAmount", 5)?.innerText),
                averagePrice: parseMoney(getCellByKey(cells, "averagePrice", 6)?.innerText),
                overpay: parseMoney(getCellByKey(cells, "overpay", 7)?.innerText),
                savingsOpportunity: parseMoney(getCellByKey(cells, "savingsOpportunity", 8)?.innerText),
                date: getCellByKey(cells, "date", 9)?.innerText.trim() || tr.dataset.date || "",
                status: getCellByKey(cells, "status", 10)?.innerText.trim() || "",
                overpayPct: parsePct(tr.dataset.overpayPct || "0")
            };
        }).filter((row) => row.productName && row.supplier);
    }

    function renderPresetQuestions(elements, activeQuestion) {
        if (!elements.aiPresetGrid) {
            return;
        }

        elements.aiPresetGrid.innerHTML = presetQuestions.map((question) => `
            <button type="button" class="ai-preset-card ${activeQuestion === question ? "is-active" : ""}" data-ai-question="${question}">
                <span class="ai-preset-card-label">Preset Insight</span>
                <span class="ai-preset-card-text">${question}</span>
            </button>
        `).join("");
    }

    function setWorkspaceVisibility(elements, isOpen) {
        if (elements.mainDashboardView) {
            elements.mainDashboardView.hidden = isOpen;
        }
        if (elements.aiWorkspace) {
            elements.aiWorkspace.hidden = !isOpen;
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function resetAnswerView(elements, message) {
        if (elements.aiAnswerState) {
            elements.aiAnswerState.textContent = message;
            elements.aiAnswerState.hidden = false;
        }
        if (elements.aiAnswerBody) {
            elements.aiAnswerBody.hidden = true;
        }
        if (elements.aiAnswerInsights) {
            elements.aiAnswerInsights.innerHTML = "";
        }
        if (elements.aiFollowupRow) {
            elements.aiFollowupRow.innerHTML = "";
        }
    }

    function renderAnswer(elements, answer) {
        if (elements.aiAnswerState) {
            elements.aiAnswerState.hidden = true;
        }
        if (elements.aiAnswerBody) {
            elements.aiAnswerBody.hidden = false;
        }
        if (elements.aiAnswerHeadline) {
            elements.aiAnswerHeadline.textContent = answer.headline || "AI insight ready";
        }
        if (elements.aiAnswerPeriod) {
            elements.aiAnswerPeriod.textContent = answer.period_label || "Current visible period";
        }
        if (elements.aiAnswerSource) {
            const rowCount = Number(answer.source_row_count || 0);
            elements.aiAnswerSource.textContent = `Computed from ${rowCount} visible row${rowCount === 1 ? "" : "s"}`;
        }
        if (elements.aiAnswerAction) {
            elements.aiAnswerAction.textContent = answer.recommended_action || "";
        }
        if (elements.aiAnswerInsights) {
            elements.aiAnswerInsights.innerHTML = "";
            (answer.insights || []).forEach((insight) => {
                const item = document.createElement("li");
                item.textContent = insight;
                elements.aiAnswerInsights.appendChild(item);
            });
        }
        if (elements.aiFollowupRow) {
            elements.aiFollowupRow.innerHTML = "";
            (answer.suggestions || []).forEach((suggestion) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "ai-followup-chip";
                button.dataset.aiQuestion = suggestion;
                button.textContent = suggestion;
                elements.aiFollowupRow.appendChild(button);
            });
        }
    }

    async function askQuestion(question, elements, state) {
        const rows = getVisibleRows(elements);
        if (!rows.length) {
            state.activeQuestion = null;
            renderPresetQuestions(elements, state.activeQuestion);
            resetAnswerView(elements, "Analyze a dataset first, then ask AI questions from the visible rows.");
            return;
        }

        state.activeQuestion = question;
        renderPresetQuestions(elements, state.activeQuestion);
        resetAnswerView(elements, "Building an executive insight from the current analyzed rows...");

        if (elements.askAiButton) {
            elements.askAiButton.disabled = true;
        }

        try {
            const response = await fetch("/ask-data", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: JSON.stringify({
                    question,
                    rows
                })
            });

            const data = await response.json();
            if (!response.ok || data.success !== true) {
                throw new Error(data.message || "AI insights could not be generated.");
            }

            renderAnswer(elements, data);
        } catch (error) {
            resetAnswerView(elements, error.message || "AI insights could not be generated.");
        } finally {
            if (elements.askAiButton) {
                elements.askAiButton.disabled = false;
            }
        }
    }

    function syncAvailability(elements, state) {
        const rowCount = getVisibleRows(elements).length;
        const hasRows = rowCount > 0;
        const hasAnalysis = hasAnalyzedDataset(elements, rowCount);

        if (elements.askDataPanel) {
            elements.askDataPanel.hidden = !hasAnalysis;
        }
        if (elements.aiEntryShell) {
            elements.aiEntryShell.hidden = !hasAnalysis;
        }
        if (elements.aiWorkspaceEntryChip) {
            elements.aiWorkspaceEntryChip.textContent = hasRows
                ? `${rowCount} rows ready for AI`
                : hasAnalysis ? "Analyzed dataset ready" : "AI unlocks after analysis";
        }
        if (elements.aiWorkspaceContextChip) {
            elements.aiWorkspaceContextChip.textContent = hasRows
                ? `${rowCount} visible row${rowCount === 1 ? "" : "s"} in scope`
                : hasAnalysis ? "No visible rows in scope" : "No analyzed rows in scope";
        }

        if (!hasAnalysis && !elements.aiWorkspace?.hidden) {
            setWorkspaceVisibility(elements, false);
            resetAnswerView(elements, "Analyze a dataset first, then ask AI questions from the visible rows.");
            state.activeQuestion = null;
            renderPresetQuestions(elements, state.activeQuestion);
        }
    }

    function bindEvents(elements, state) {
        if (elements.openAiWorkspaceButton) {
            elements.openAiWorkspaceButton.addEventListener("click", () => {
                setWorkspaceVisibility(elements, true);
                if (elements.aiQuestionInput) {
                    elements.aiQuestionInput.focus();
                }
            });
        }

        if (elements.closeAiWorkspaceButton) {
            elements.closeAiWorkspaceButton.addEventListener("click", () => {
                setWorkspaceVisibility(elements, false);
            });
        }

        if (elements.aiPresetGrid) {
            elements.aiPresetGrid.addEventListener("click", (event) => {
                const button = event.target.closest("[data-ai-question]");
                if (!button) {
                    return;
                }
                const question = button.dataset.aiQuestion || "";
                if (elements.aiQuestionInput) {
                    elements.aiQuestionInput.value = question;
                }
                askQuestion(question, elements, state);
            });
        }

        if (elements.aiFollowupRow) {
            elements.aiFollowupRow.addEventListener("click", (event) => {
                const button = event.target.closest("[data-ai-question]");
                if (!button) {
                    return;
                }
                const question = button.dataset.aiQuestion || "";
                if (elements.aiQuestionInput) {
                    elements.aiQuestionInput.value = question;
                }
                askQuestion(question, elements, state);
            });
        }

        if (elements.aiQuestionForm) {
            elements.aiQuestionForm.addEventListener("submit", (event) => {
                event.preventDefault();
                const question = elements.aiQuestionInput?.value.trim() || "";
                if (!question) {
                    resetAnswerView(elements, "Enter a business question to generate an executive answer.");
                    return;
                }
                askQuestion(question, elements, state);
            });
        }
    }

    function init() {
        const elements = getElements();
        if (!elements.aiWorkspace || !elements.tableBody) {
            return;
        }

        const state = {
            activeQuestion: null
        };

        renderPresetQuestions(elements, state.activeQuestion);
        resetAnswerView(elements, "Select a preset or ask a custom question to generate an executive-ready answer from the analyzed dataset.");
        syncAvailability(elements, state);
        bindEvents(elements, state);

        const observer = new MutationObserver(() => {
            syncAvailability(elements, state);
        });
        observer.observe(elements.tableBody, { childList: true, subtree: true });
    }

    document.addEventListener("DOMContentLoaded", init);
})();
