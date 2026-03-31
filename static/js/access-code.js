(function () {
    const ACCESS_CODE_KEY = "access_code";
    const SESSION_ID_KEY = "session_id";
    let isSubmitting = false;
    let isInitialized = false;
    let hasValidatedSuccessfully = false;

    function getElements() {
        return {
            accessShell: document.getElementById("accessShell"),
            appShell: document.getElementById("appShell"),
            accessCodeForm: document.getElementById("accessCodeForm"),
            accessCodeInput: document.getElementById("accessCodeInput"),
            accessSubmitButton: document.getElementById("accessSubmitButton"),
            accessCodeError: document.getElementById("accessCodeError"),
            logoutButton: document.getElementById("logoutButton")
        };
    }

    function normalizeCode(code) {
        return (code || "").trim().toUpperCase();
    }

    function finishBoot() {
        document.documentElement.classList.remove("auth-pending");
        document.body?.classList.remove("app-booting");
    }

    function showDashboard(elements) {
        console.log("UNLOCKING DASHBOARD");
        if (elements.accessShell) {
            elements.accessShell.hidden = true;
            elements.accessShell.style.display = "none";
            console.log("ACCESS GATE HIDDEN");
        }
        if (elements.appShell) {
            elements.appShell.hidden = false;
            elements.appShell.classList.remove("app-shell-locked");
            elements.appShell.style.display = "block";
            console.log("DASHBOARD SHOWN");
        }
        if (elements.logoutButton) {
            elements.logoutButton.hidden = false;
        }
        finishBoot();
        document.dispatchEvent(new CustomEvent("price-analyzer:dashboard-unlocked"));
    }

    function showAccessScreen(elements) {
        if (elements.accessShell) {
            elements.accessShell.hidden = false;
            elements.accessShell.style.display = "block";
        }
        if (elements.appShell) {
            elements.appShell.hidden = true;
            elements.appShell.classList.add("app-shell-locked");
            elements.appShell.style.display = "none";
        }
        if (elements.logoutButton) {
            elements.logoutButton.hidden = true;
        }
        finishBoot();
    }

    function setError(elements, message) {
        if (!elements.accessCodeError) return;
        elements.accessCodeError.textContent = message;
        elements.accessCodeError.hidden = !message;
    }

    function setSubmitButtonDisabled(elements, disabled) {
        if (!elements.accessSubmitButton) {
            return;
        }
        elements.accessSubmitButton.disabled = disabled;
        if (!disabled) {
            console.log("BUTTON RE-ENABLED");
        }
    }

    function clearStoredAccess() {
        localStorage.removeItem(ACCESS_CODE_KEY);
        localStorage.removeItem(SESSION_ID_KEY);
    }

    function getStoredAccess() {
        return {
            code: localStorage.getItem(ACCESS_CODE_KEY),
            sessionId: localStorage.getItem(SESSION_ID_KEY)
        };
    }

    async function validateCode(code, sessionId, source) {
        console.log("VALIDATE CALLED FROM:", source);
        const response = await fetch("/validate-code", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                code,
                session_id: sessionId || null
            })
        });

        if (!response.ok) {
            throw new Error("Access validation failed.");
        }

        const payload = await response.json();
        console.log("[access] validate-code response", payload);
        return payload;
    }

    async function unlockWithCode(elements, rawCode, source) {
        if (hasValidatedSuccessfully) {
            return true;
        }
        const normalizedCode = normalizeCode(rawCode);
        const { sessionId } = getStoredAccess();
        if (!normalizedCode) {
            setError(elements, "Please enter an access code.");
            return false;
        }

        const payload = await validateCode(normalizedCode, sessionId, source);
        console.log(payload);

        if (payload.success === true && payload.session_id) {
            console.log("VALIDATION SUCCESS", payload);
            hasValidatedSuccessfully = true;
            localStorage.setItem(ACCESS_CODE_KEY, normalizedCode);
            localStorage.setItem(SESSION_ID_KEY, payload.session_id);
            console.log("[access] stored session", {
                code: normalizedCode,
                sessionId: payload.session_id
            });
            setError(elements, "");
            showDashboard(elements);
            return true;
        }

        if (payload.success === false) {
            clearStoredAccess();
            setError(elements, payload.message || "Invalid access code. Please try again.");
            return false;
        }

        clearStoredAccess();
        setError(elements, "We could not validate the code right now. Please try again.");
        return false;
    }

    async function restoreStoredAccess(elements) {
        if (hasValidatedSuccessfully) {
            return;
        }
        const storedAccess = getStoredAccess();
        if (!storedAccess.code || !storedAccess.sessionId) {
            clearStoredAccess();
            showAccessScreen(elements);
            return;
        }

        try {
            const unlocked = await unlockWithCode(elements, storedAccess.code, "init");
            if (!unlocked) {
                showAccessScreen(elements);
            }
        } catch (error) {
            clearStoredAccess();
            setError(elements, "We could not verify the saved access code. Please enter it again.");
            showAccessScreen(elements);
        }
    }

    async function logout() {
        const storedAccess = getStoredAccess();
        if (!storedAccess.code || !storedAccess.sessionId) {
            clearStoredAccess();
            window.location.reload();
            return;
        }

        try {
            await fetch("/logout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    code: storedAccess.code,
                    session_id: storedAccess.sessionId
                })
            });
        } finally {
            clearStoredAccess();
            window.location.reload();
        }
    }

    async function handleSubmit(event, elements) {
        console.log("UNLOCK CLICK");
        event.preventDefault();
        event.stopPropagation();
        if (isSubmitting || hasValidatedSuccessfully) {
            return;
        }
        console.log("SUBMIT START");
        isSubmitting = true;
        setSubmitButtonDisabled(elements, true);
        setError(elements, "");
        clearStoredAccess();

        try {
            const unlocked = await unlockWithCode(elements, elements.accessCodeInput?.value || "", "button");
            if (unlocked) {
                return;
            }
        } catch (error) {
            setError(elements, "We could not validate the code right now. Please try again.");
            showAccessScreen(elements);
        } finally {
            isSubmitting = false;
            console.log("SUBMIT END");
            if (!hasValidatedSuccessfully) {
                setSubmitButtonDisabled(elements, false);
            }
        }
    }

    function bindEvents(elements) {
        if (!elements.accessCodeForm) return;
        if (elements.accessCodeForm.dataset.bound === "true") return;
        elements.accessCodeForm.dataset.bound = "true";

        elements.accessCodeForm.addEventListener("submit", (event) => {
            event.preventDefault();
            event.stopPropagation();
        });

        if (elements.accessSubmitButton) {
            elements.accessSubmitButton.addEventListener("click", (event) => {
                handleSubmit(event, elements);
            });
        }

        if (elements.logoutButton && elements.logoutButton.dataset.bound !== "true") {
            elements.logoutButton.dataset.bound = "true";
            elements.logoutButton.addEventListener("click", () => {
                logout();
            });
        }
    }

    async function init() {
        if (isInitialized) {
            return;
        }
        isInitialized = true;
        console.log("ACCESS INIT START");
        const elements = getElements();
        if (elements.accessCodeInput) {
            elements.accessCodeInput.disabled = false;
            elements.accessCodeInput.readOnly = false;
            console.log("INPUT ENABLED");
        }
        setSubmitButtonDisabled(elements, false);
        bindEvents(elements);
        await restoreStoredAccess(elements);
    }

    document.addEventListener("DOMContentLoaded", init);
})();
