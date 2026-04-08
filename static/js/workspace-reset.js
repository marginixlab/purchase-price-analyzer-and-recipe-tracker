(function () {
    const QUOTE_COMPARE_ACTIVE_SESSION_KEY = "quote_compare_active_session_v1";
    const QUOTE_COMPARE_STATE_KEY = "quote_compare_state_v1";
    const QUOTE_COMPARE_SCROLL_KEY = "quote_compare_scroll_v1";
    const QUOTE_COMPARE_LAST_SCREEN_KEY = "quote_compare_last_screen_v1";
    const RECIPES_BOOTSTRAP_CACHE_KEY = "recipes_bootstrap_cache_v1";

    function getAuthUserStorageSuffix() {
        const rawUserId = String(document.body?.dataset?.authUserId || "").trim();
        return rawUserId || "anonymous";
    }

    function clearFrontendResetState() {
        try {
            sessionStorage.removeItem(QUOTE_COMPARE_ACTIVE_SESSION_KEY);
            sessionStorage.removeItem(QUOTE_COMPARE_STATE_KEY);
            sessionStorage.removeItem(QUOTE_COMPARE_SCROLL_KEY);
            sessionStorage.removeItem(QUOTE_COMPARE_LAST_SCREEN_KEY);
            sessionStorage.removeItem(`${RECIPES_BOOTSTRAP_CACHE_KEY}:${getAuthUserStorageSuffix()}`);
            if (window.__analysisScopeBootstrapCache && typeof window.__analysisScopeBootstrapCache === "object") {
                window.__analysisScopeBootstrapCache = {};
            }
        } catch (error) {
            // Ignore storage failures.
        }
        console.info("[PERF] reset.frontend_state_cleared", {
            user: getAuthUserStorageSuffix()
        });
    }

    function isDemoMode() {
        return document.body?.dataset?.demoMode === "true";
    }

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
        if (isDemoMode()) {
            clearFrontendResetState();
            window.PriceAnalyzerBootGuard?.resetAllUiState?.();
            window.location.assign("/?demo-entry=1");
            return true;
        }
        const scopeSummaryText = "No analyzed file yet";
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
        clearFrontendResetState();
        window.PriceAnalyzerBootGuard?.resetAllUiState?.();
        window.dispatchEvent(new CustomEvent("shared-analysis-context-updated", {
            detail: {
                scope: "current_upload",
                uploadId: ""
            }
        }));
        window.dispatchEvent(new CustomEvent("workspace-reset-completed"));
        window.resetQuoteCompareToStep1?.();
        return false;
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
                const redirectedToDemoEntry = applyResetUiState();
                if (redirectedToDemoEntry) {
                    return;
                }
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
