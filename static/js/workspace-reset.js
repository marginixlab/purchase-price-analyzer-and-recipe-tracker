(function () {
    async function reloadSavedRecipesUi() {
        if (window.PriceAnalyzerRecipes?.reloadSavedRecipes) {
            await window.PriceAnalyzerRecipes.reloadSavedRecipes();
            return;
        }

        const response = await fetch("/recipes/bootstrap", {
            headers: {
                Accept: "application/json"
            }
        });

        try {
            await response.json();
        } catch (error) {
            console.error("[workspace reset] recipes bootstrap rehydrate failed", error);
        }
    }

    function applyResetUiState() {
        const scopeSummaryText = "Current File • No analyzed file yet";
        document.getElementById("mainDashboardView")?.setAttribute("data-has-analysis", "false");
        document.getElementById("recipesWorkspaceState")?.setAttribute("data-has-analysis", "false");
        const quoteSummary = document.getElementById("quoteDataScopeSummary");
        if (quoteSummary) {
            quoteSummary.textContent = scopeSummaryText;
        }
        const recipeSummary = document.getElementById("recipeDataScopeSummary");
        if (recipeSummary) {
            recipeSummary.textContent = scopeSummaryText;
        }
        const continueAnalysisButton = document.getElementById("quoteContinueAnalysisButton");
        if (continueAnalysisButton) {
            continueAnalysisButton.hidden = true;
        }
        window.PriceAnalyzerBootGuard?.resetAllUiState?.();
        window.dispatchEvent(new CustomEvent("shared-analysis-context-updated", {
            detail: {
                scope: "current_upload",
                uploadId: ""
            }
        }));
        window.dispatchEvent(new CustomEvent("workspace-reset-completed"));
        window.resetQuoteCompareToStep1?.();
    }

    async function resetWorkspaceData() {
        const response = await fetch("/workspace/reset", {
            method: "POST",
            headers: {
                Accept: "application/json"
            }
        });
        const responseClone = response.clone();
        let data = null;
        try {
            data = await response.json();
        } catch (error) {
            const rawResponse = await responseClone.text().catch(() => "");
            console.error("[workspace reset] non-JSON response", {
                status: response.status,
                body: rawResponse
            });
            throw new Error("Workspace reset failed.");
        }
        if (!response.ok || data.success !== true) {
            throw new Error(data.message || "Workspace reset failed.");
        }
        return data;
    }

    function initWorkspaceReset() {
        const triggerButtons = Array.from(document.querySelectorAll("[data-reset-workspace]"));
        const overlay = document.getElementById("workspaceResetOverlay");
        const cancelButton = document.getElementById("workspaceResetCancelButton");
        const confirmButton = document.getElementById("workspaceResetConfirmButton");

        if (!triggerButtons.length || !overlay || !cancelButton || !confirmButton) {
            return;
        }

        let isSubmitting = false;

        function closeModal() {
            if (isSubmitting) {
                return;
            }
            overlay.hidden = true;
            document.body.classList.remove("is-workspace-reset-open");
        }

        function openModal() {
            overlay.hidden = false;
            document.body.classList.add("is-workspace-reset-open");
            window.requestAnimationFrame(() => {
                cancelButton.focus();
            });
        }

        triggerButtons.forEach((button) => {
            if (button.dataset.bound === "true") {
                return;
            }
            button.dataset.bound = "true";
            button.addEventListener("click", openModal);
        });

        cancelButton.addEventListener("click", closeModal);

        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) {
                closeModal();
            }
        });

        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !overlay.hidden) {
                closeModal();
            }
        });

        confirmButton.addEventListener("click", async () => {
            if (isSubmitting) {
                return;
            }
            isSubmitting = true;
            confirmButton.disabled = true;
            confirmButton.textContent = "Resetting...";
            try {
                await resetWorkspaceData();
                applyResetUiState();
                if (document.body?.dataset.activeView === "recipes") {
                    window.location.assign("/");
                    return;
                }
                await reloadSavedRecipesUi();
                confirmButton.disabled = false;
                confirmButton.textContent = "Reset Data";
                isSubmitting = false;
                closeModal();
            } catch (error) {
                confirmButton.disabled = false;
                confirmButton.textContent = "Reset Data";
                isSubmitting = false;
                window.alert(error.message || "Workspace reset failed.");
            }
        });
    }

    document.addEventListener("DOMContentLoaded", initWorkspaceReset);
})();
