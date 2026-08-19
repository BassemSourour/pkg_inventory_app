window.InventoryApp = {
    selectedItem: null,
    searchTimer: null,
    highlightedResultIndex: -1,
    currentResultItems: [],
    tapShieldActive: false,
    tapShieldTimer: null,
};


InventoryApp.escapeHtml = function (value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
};


InventoryApp.getValidCount = function (
    inputId,
    statusElement
) {
    const input =
        document.getElementById(inputId);

    if (!input) {
        statusElement.textContent =
            "Count input could not be found.";

        return null;
    }

    const rawValue = input.value.trim();

    if (!rawValue) {
        statusElement.textContent =
            "Count is required.";

        return null;
    }

    const count = Number(rawValue);

    if (!Number.isFinite(count)) {
        statusElement.textContent =
            "Count must be a number.";

        return null;
    }

    if (count <= 0) {
        statusElement.textContent =
            "Count must be greater than 0.";

        return null;
    }

    return count;
};


InventoryApp.showTab = function (tabName) {
    document
        .querySelectorAll(".tab")
        .forEach(button => {
            button.classList.remove("active");
        });

    document
        .querySelectorAll(".tab-content")
        .forEach(section => {
            section.classList.remove("active");
        });

    const selectedSection =
        document.getElementById(tabName);

    if (!selectedSection) {
        return;
    }

    const tabButtons =
        document.querySelectorAll(".tab");

    if (tabName === "manual") {
        tabButtons[0]?.classList.add("active");
    }

    selectedSection.classList.add("active");
};


InventoryApp.selectItem = function (item) {
    InventoryApp.selectedItem = item;

    const selectedCard =
        document.getElementById(
            "selectedCard"
        );

    if (!selectedCard) {
        return;
    }

    selectedCard.classList.remove("hidden");

    document.getElementById(
        "selectedItemNumber"
    ).textContent = item.item_number;

    document.getElementById(
        "selectedProductName"
    ).textContent =
        item.product_name || "";

    document.getElementById(
        "selectedInventory"
    ).textContent = "";

    const displayedTotal =
        item.counted === null ||
        item.counted === undefined
            ? ""
            : item.counted;

    document.getElementById(
    "selectedExistingCount"
    ).textContent =
        `Current counted total: ${displayedTotal}`;

    const selectedEntryCount =
        document.getElementById(
            "selectedEntryCount"
        );

    if (selectedEntryCount) {
        selectedEntryCount.textContent =
            "Number of entries: Loading...";
    }

    const countInput =
        document.getElementById(
            "countInput"
        );

    if (countInput) {
        countInput.value = "";
        countInput.readOnly = false;
    }

    document.getElementById(
        "saveStatus"
    ).textContent = "";

    document.getElementById(
        "results"
    ).innerHTML = "";

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    if (searchInput) {
        searchInput.value = "";
    }

    document.getElementById(
        "selectedItemEntriesWrapper"
    ).classList.add("hidden");

    document.getElementById(
        "notFoundArea"
    )?.classList.add("hidden");

    document.getElementById(
        "manualExceptionCard"
    )?.classList.add("hidden");

    InventoryApp.setSearchStatus("");

    /*
     * The item is open again, so the shortcut back to
     * it is no longer needed.
     */
    if (
        typeof InventoryApp
            .hideLastCountedShortcut ===
        "function"
    ) {
        InventoryApp.hideLastCountedShortcut();
    }

    InventoryApp.currentResultItems = [];
    InventoryApp.highlightedResultIndex = -1;

    if (
        typeof InventoryApp
            .loadSelectedItemEntryCount ===
        "function"
    ) {
        InventoryApp
            .loadSelectedItemEntryCount();
    }

    if (countInput) {
        window.setTimeout(() => {
            countInput.focus();
        }, 100);
    }
};


/*
 * Cover the page for a moment so the tap that saved a
 * count cannot also press whatever button the layout
 * change moved under the operator's finger.
 */
InventoryApp.shieldTaps = function (duration) {
    let shield =
        document.getElementById("tapShield");

    if (!shield) {
        shield =
            document.createElement("div");

        shield.id = "tapShield";
        shield.className = "tap-shield";

        shield.setAttribute(
            "aria-hidden",
            "true"
        );

        [
            "pointerdown",
            "pointerup",
            "touchstart",
            "touchend",
            "click",
        ].forEach(eventName => {
            shield.addEventListener(
                eventName,
                event => {
                    event.preventDefault();
                    event.stopPropagation();
                }
            );
        });

        document.body.appendChild(shield);
    }

    shield.classList.remove("hidden");

    InventoryApp.tapShieldActive = true;

    window.clearTimeout(
        InventoryApp.tapShieldTimer
    );

    InventoryApp.tapShieldTimer =
        window.setTimeout(() => {
            shield.classList.add("hidden");

            InventoryApp.tapShieldActive =
                false;
        }, duration || 800);
};


/*
 * True while the tap shield is up, meaning any button
 * press arriving right now is a leftover from the tap
 * that just saved a count.
 */
InventoryApp.isStrayTap = function () {
    return (
        InventoryApp.tapShieldActive === true
    );
};


/*
 * Remember the packaging material that was just counted
 * so the operator can jump straight back to it when they
 * still have several of the same item in front of them.
 */
InventoryApp.showLastCountedShortcut =
function (item) {
    const area =
        document.getElementById(
            "lastCountedArea"
        );

    const label =
        document.getElementById(
            "lastCountedLabel"
        );

    const button =
        document.getElementById(
            "lastCountedButton"
        );

    if (!area || !item || !item.item_number) {
        InventoryApp.hideLastCountedShortcut();

        return;
    }

    InventoryApp.lastCountedItem = {
        item_number: item.item_number,
        product_name: item.product_name || "",
    };

    if (label) {
        label.textContent =
            item.product_name
                ? `${item.item_number} — ${item.product_name}`
                : item.item_number;
    }

    if (button) {
        button.textContent =
            `Back to ${item.item_number}`;

        button.disabled = false;
    }

    area.classList.remove("hidden");
};


InventoryApp.hideLastCountedShortcut =
function () {
    InventoryApp.lastCountedItem = null;

    document.getElementById(
        "lastCountedArea"
    )?.classList.add("hidden");
};


/*
 * Reopen the remembered item with a freshly loaded
 * total, so the next entry is added on top of the
 * count that was just saved.
 */
InventoryApp.reopenLastCountedItem =
async function () {
    if (InventoryApp.isStrayTap()) {
        return;
    }

    const remembered =
        InventoryApp.lastCountedItem;

    if (!remembered) {
        return;
    }

    const button =
        document.getElementById(
            "lastCountedButton"
        );

    if (button) {
        button.disabled = true;
        button.textContent = "Opening...";
    }

    try {
        const response = await fetch(
            `/api/item?item_number=${
                encodeURIComponent(
                    remembered.item_number
                )
            }`
        );

        const data = await response.json();

        if (!response.ok || !data.item) {
            InventoryApp.setSearchStatus(
                data.error ||
                "That item could not be reopened."
            );

            return;
        }

        InventoryApp.hideLastCountedShortcut();

        InventoryApp.selectItem(data.item);

    } catch (error) {
        console.error(error);

        InventoryApp.setSearchStatus(
            "Could not connect to the server."
        );

    } finally {
        if (button) {
            button.disabled = false;

            button.textContent =
                `Back to ${remembered.item_number}`;
        }
    }
};


InventoryApp.setSearchStatus =
function (message) {
    const searchStatus =
        document.getElementById(
            "searchStatus"
        );

    if (!searchStatus) {
        return;
    }

    searchStatus.textContent =
        message || "";

    searchStatus.classList.toggle(
        "hidden",
        !message
    );
};


/*
 * Close the selected item and hand the operator
 * back to the search field, ready for the next
 * packaging material.
 */
InventoryApp.returnToSearch =
function (message, countedItem) {
    /*
     * Raise the shield before the layout changes.
     */
    InventoryApp.shieldTaps(800);

    InventoryApp.selectedItem = null;

    document.getElementById(
        "selectedCard"
    )?.classList.add("hidden");

    document.getElementById(
        "manualExceptionCard"
    )?.classList.add("hidden");

    document.getElementById(
        "selectedItemEntriesWrapper"
    )?.classList.add("hidden");

    const countInput =
        document.getElementById(
            "countInput"
        );

    if (countInput) {
        countInput.value = "";
        countInput.readOnly = false;

        countInput.setAttribute(
            "inputmode",
            "decimal"
        );
    }

    const saveStatus =
        document.getElementById(
            "saveStatus"
        );

    if (saveStatus) {
        saveStatus.textContent = "";
    }

    const results =
        document.getElementById(
            "results"
        );

    if (results) {
        results.innerHTML = "";
    }

    document.getElementById(
        "notFoundArea"
    )?.classList.add("hidden");

    InventoryApp.currentResultItems = [];
    InventoryApp.highlightedResultIndex = -1;

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    if (searchInput) {
        searchInput.value = "";
    }

    InventoryApp.setSearchStatus(message);

    /*
     * Offer a one-tap way back to the item that was
     * just counted, for operators working through a
     * stack of the same packaging material.
     */
    if (countedItem) {
        InventoryApp.showLastCountedShortcut(
            countedItem
        );
    } else {
        InventoryApp.hideLastCountedShortcut();
    }

    /*
     * Bring the search card to the top of the screen.
     * This keeps the workbook buttons above the
     * viewport instead of under the operator's finger.
     */
    const searchSection =
        document.getElementById("manual");

    if (searchSection) {
        try {
            searchSection.scrollIntoView({
                block: "start",
                behavior: "auto",
            });
        } catch (error) {
            searchSection.scrollIntoView(true);
        }
    }

    /*
     * Focus the search field so the next item
     * number can be typed straight away.
     */
    if (searchInput) {
        window.setTimeout(() => {
            searchInput.focus();
        }, 100);
    }
};


InventoryApp.clearSelection = function () {
    InventoryApp.selectedItem = null;

    document.getElementById(
        "selectedCard"
    )?.classList.add("hidden");

    InventoryApp.setSearchStatus("");

    const countInput =
        document.getElementById(
            "countInput"
        );

    if (countInput) {
        countInput.value = "";
        countInput.blur();
    }

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    if (searchInput) {
        searchInput.blur();
    }

    if (
        document.activeElement &&
        typeof document.activeElement.blur
            === "function"
    ) {
        document.activeElement.blur();
    }
};


InventoryApp.showReplacementPassword =
function () {
    if (InventoryApp.isStrayTap()) {
        return;
    }

    const passwordArea =
        document.getElementById(
            "replacePasswordArea"
        );

    const passwordInput =
        document.getElementById(
            "replaceUploadPassword"
        );

    const status =
        document.getElementById(
            "replaceUploadStatus"
        );

    if (!passwordArea || !passwordInput) {
        return;
    }

    passwordArea.classList.remove(
        "hidden"
    );

    passwordInput.value = "";

    passwordInput.classList.remove(
        "input-error"
    );

    if (status) {
        status.textContent = "";

        status.classList.remove(
            "error-message"
        );
    }

    window.setTimeout(() => {
        passwordInput.focus();
    }, 100);
};


InventoryApp.hideReplacementPassword =
function () {
    const passwordArea =
        document.getElementById(
            "replacePasswordArea"
        );

    const passwordInput =
        document.getElementById(
            "replaceUploadPassword"
        );

    const fileInput =
        document.getElementById(
            "replaceFileInput"
        );

    const status =
        document.getElementById(
            "replaceUploadStatus"
        );

    passwordArea?.classList.add(
        "hidden"
    );

    if (passwordInput) {
        passwordInput.value = "";

        passwordInput.classList.remove(
            "input-error"
        );

        passwordInput.blur();
    }

    if (fileInput) {
        fileInput.value = "";
    }

    if (status) {
        status.textContent = "";

        status.classList.remove(
            "error-message"
        );
    }
};


InventoryApp.validateReplacementPassword =
async function () {
    const passwordInput =
        document.getElementById(
            "replaceUploadPassword"
        );

    const continueButton =
        document.getElementById(
            "replacePasswordContinueButton"
        );

    const status =
        document.getElementById(
            "replaceUploadStatus"
        );

    const fileInput =
        document.getElementById(
            "replaceFileInput"
        );

    if (
        !passwordInput ||
        !status ||
        !fileInput
    ) {
        return;
    }

    const password =
        passwordInput.value.trim();

    status.textContent = "";

    status.classList.remove(
        "error-message"
    );

    passwordInput.classList.remove(
        "input-error"
    );

    if (!password) {
        status.textContent =
            "Please enter the admin password.";

        status.classList.add(
            "error-message"
        );

        passwordInput.classList.add(
            "input-error"
        );

        passwordInput.focus();

        return;
    }

    if (continueButton) {
        continueButton.disabled = true;

        continueButton.textContent =
            "Checking...";
    }

    try {
        const response = await fetch(
            "/validate-upload-password",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                },
                body: JSON.stringify({
                    password: password,
                }),
            }
        );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.valid
        ) {
            status.textContent =
                data.message ||
                "Incorrect admin password.";

            status.classList.add(
                "error-message"
            );

            passwordInput.classList.add(
                "input-error"
            );

            passwordInput.select();
            passwordInput.focus();

            return;
        }

        status.textContent = "";

        status.classList.remove(
            "error-message"
        );

        passwordInput.classList.remove(
            "input-error"
        );

        fileInput.value = "";

        fileInput.click();

    } catch (error) {
        status.textContent =
            "Could not validate the password. "
            + "Check the connection and try again.";

        status.classList.add(
            "error-message"
        );

        passwordInput.classList.add(
            "input-error"
        );

        passwordInput.focus();

    } finally {
        if (continueButton) {
            continueButton.disabled = false;

            continueButton.textContent =
                "Continue";
        }
    }
};


InventoryApp.submitReplacementWorkbook =
function () {
    const form =
        document.getElementById(
            "replaceWorkbookForm"
        );

    const fileInput =
        document.getElementById(
            "replaceFileInput"
        );

    const status =
        document.getElementById(
            "replaceUploadStatus"
        );

    if (!form || !fileInput) {
        return;
    }

    if (
        !fileInput.files ||
        fileInput.files.length === 0
    ) {
        return;
    }

    if (status) {
        status.textContent =
            "Loading workbook...";

        status.classList.remove(
            "error-message"
        );
    }

    form.submit();
};


InventoryApp.showDownloadPassword =
function () {
    if (InventoryApp.isStrayTap()) {
        return;
    }

    const passwordArea =
        document.getElementById(
            "downloadPasswordArea"
        );

    const passwordInput =
        document.getElementById(
            "downloadPassword"
        );

    const status =
        document.getElementById(
            "downloadStatus"
        );

    if (!passwordArea || !passwordInput) {
        return;
    }

    passwordArea.classList.remove(
        "hidden"
    );

    passwordInput.value = "";

    passwordInput.classList.remove(
        "input-error"
    );

    if (status) {
        status.textContent = "";

        status.classList.remove(
            "error-message"
        );
    }

    window.setTimeout(() => {
        passwordInput.focus();
    }, 100);
};


InventoryApp.hideDownloadPassword =
function () {
    const passwordArea =
        document.getElementById(
            "downloadPasswordArea"
        );

    const passwordInput =
        document.getElementById(
            "downloadPassword"
        );

    const status =
        document.getElementById(
            "downloadStatus"
        );

    passwordArea?.classList.add(
        "hidden"
    );

    if (passwordInput) {
        passwordInput.value = "";

        passwordInput.classList.remove(
            "input-error"
        );

        passwordInput.blur();
    }

    if (status) {
        status.textContent = "";

        status.classList.remove(
            "error-message"
        );
    }
};


InventoryApp.validateDownloadPassword =
async function () {
    const passwordInput =
        document.getElementById(
            "downloadPassword"
        );

    const continueButton =
        document.getElementById(
            "downloadContinueButton"
        );

    const status =
        document.getElementById(
            "downloadStatus"
        );

    if (!passwordInput || !status) {
        return;
    }

    const password =
        passwordInput.value.trim();

    status.textContent = "";

    status.classList.remove(
        "error-message"
    );

    passwordInput.classList.remove(
        "input-error"
    );

    if (!password) {
        status.textContent =
            "Please enter the admin password.";

        status.classList.add(
            "error-message"
        );

        passwordInput.classList.add(
            "input-error"
        );

        passwordInput.focus();

        return;
    }

    if (continueButton) {
        continueButton.disabled = true;

        continueButton.textContent =
            "Checking...";
    }

    try {
        const validationResponse = await fetch(
            "/validate-upload-password",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                },
                body: JSON.stringify({
                    password: password,
                }),
            }
        );

        const validationData =
            await validationResponse.json();

        if (
            !validationResponse.ok ||
            !validationData.valid
        ) {
            status.textContent =
                validationData.message ||
                "Incorrect admin password.";

            status.classList.add(
                "error-message"
            );

            passwordInput.classList.add(
                "input-error"
            );

            passwordInput.select();
            passwordInput.focus();

            return;
        }

        status.textContent =
            "Preparing download...";

        await InventoryApp.downloadWorkbook(
            password
        );

    } catch (error) {
        status.textContent =
            "Could not validate the password. "
            + "Check the connection and try again.";

        status.classList.add(
            "error-message"
        );

        passwordInput.classList.add(
            "input-error"
        );

        passwordInput.focus();

    } finally {
        if (continueButton) {
            continueButton.disabled = false;

            continueButton.textContent =
                "Continue";
        }
    }
};


InventoryApp.downloadWorkbook =
async function (password) {
    const passwordInput =
        document.getElementById(
            "downloadPassword"
        );

    const status =
        document.getElementById(
            "downloadStatus"
        );

    try {
        const response = await fetch(
            "/download",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                },
                body: JSON.stringify({
                    password: password,
                }),
            }
        );

        if (!response.ok) {
            let message =
                "Could not download the Excel file.";

            try {
                const errorData =
                    await response.json();

                if (errorData.message) {
                    message =
                        errorData.message;
                }

            } catch (error) {
                const errorText =
                    await response.text();

                if (errorText) {
                    message = errorText;
                }
            }

            throw new Error(message);
        }

        const workbookBlob =
            await response.blob();

        const downloadUrl =
            window.URL.createObjectURL(
                workbookBlob
            );

        const downloadLink =
            document.createElement("a");

        downloadLink.href = downloadUrl;

        downloadLink.download =
            "updated_inventory.xlsx";

        document.body.appendChild(
            downloadLink
        );

        downloadLink.click();

        downloadLink.remove();

        window.URL.revokeObjectURL(
            downloadUrl
        );

        if (status) {
            status.textContent =
                "Download started.";

            status.classList.remove(
                "error-message"
            );
        }

        if (passwordInput) {
            passwordInput.value = "";
        }

        window.setTimeout(() => {
            InventoryApp
                .hideDownloadPassword();
        }, 800);

    } catch (error) {
        if (status) {
            status.textContent =
                error.message ||
                "Could not download the Excel file.";

            status.classList.add(
                "error-message"
            );
        }

        if (passwordInput) {
            passwordInput.classList.add(
                "input-error"
            );

            passwordInput.focus();
        }

        throw error;
    }
};

InventoryApp.showInitialPassword =
function () {
    if (InventoryApp.isStrayTap()) {
        return;
    }

    const passwordArea =
        document.getElementById(
            "initialPasswordArea"
        );

    const passwordInput =
        document.getElementById(
            "initialUploadPassword"
        );

    const status =
        document.getElementById(
            "initialUploadStatus"
        );

    if (!passwordArea || !passwordInput) {
        return;
    }

    passwordArea.classList.remove(
        "hidden"
    );

    passwordInput.value = "";

    passwordInput.classList.remove(
        "input-error"
    );

    if (status) {
        status.textContent = "";

        status.classList.remove(
            "error-message"
        );
    }

    window.setTimeout(() => {
        passwordInput.focus();
    }, 100);
};


InventoryApp.hideInitialPassword =
function () {
    const passwordArea =
        document.getElementById(
            "initialPasswordArea"
        );

    const passwordInput =
        document.getElementById(
            "initialUploadPassword"
        );

    const fileInput =
        document.getElementById(
            "uploadFileInput"
        );

    const status =
        document.getElementById(
            "initialUploadStatus"
        );

    passwordArea?.classList.add(
        "hidden"
    );

    if (passwordInput) {
        passwordInput.value = "";

        passwordInput.classList.remove(
            "input-error"
        );

        passwordInput.blur();
    }

    if (fileInput) {
        fileInput.value = "";
    }

    if (status) {
        status.textContent = "";

        status.classList.remove(
            "error-message"
        );
    }
};


InventoryApp.validateInitialPassword =
async function () {
    const passwordInput =
        document.getElementById(
            "initialUploadPassword"
        );

    const continueButton =
        document.getElementById(
            "initialPasswordContinueButton"
        );

    const status =
        document.getElementById(
            "initialUploadStatus"
        );

    const fileInput =
        document.getElementById(
            "uploadFileInput"
        );

    if (
        !passwordInput ||
        !status ||
        !fileInput
    ) {
        return;
    }

    const password =
        passwordInput.value.trim();

    status.textContent = "";

    status.classList.remove(
        "error-message"
    );

    passwordInput.classList.remove(
        "input-error"
    );

    if (!password) {
        status.textContent =
            "Please enter the admin password.";

        status.classList.add(
            "error-message"
        );

        passwordInput.classList.add(
            "input-error"
        );

        passwordInput.focus();

        return;
    }

    if (continueButton) {
        continueButton.disabled = true;

        continueButton.textContent =
            "Checking...";
    }

    try {
        const response = await fetch(
            "/validate-upload-password",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                },
                body: JSON.stringify({
                    password: password,
                }),
            }
        );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.valid
        ) {
            status.textContent =
                data.message ||
                "Incorrect admin password.";

            status.classList.add(
                "error-message"
            );

            passwordInput.classList.add(
                "input-error"
            );

            passwordInput.select();
            passwordInput.focus();

            return;
        }

        status.textContent = "";

        status.classList.remove(
            "error-message"
        );

        passwordInput.classList.remove(
            "input-error"
        );

        fileInput.value = "";

        fileInput.click();

    } catch (error) {
        console.error(error);

        status.textContent =
            "Could not validate the password. "
            + "Check the connection and try again.";

        status.classList.add(
            "error-message"
        );

        passwordInput.classList.add(
            "input-error"
        );

        passwordInput.focus();

    } finally {
        if (continueButton) {
            continueButton.disabled = false;

            continueButton.textContent =
                "Continue";
        }
    }
};


InventoryApp.submitInitialWorkbook =
function () {
    const form =
        document.getElementById(
            "initialWorkbookForm"
        );

    const fileInput =
        document.getElementById(
            "uploadFileInput"
        );

    const status =
        document.getElementById(
            "initialUploadStatus"
        );

    if (!form || !fileInput) {
        return;
    }

    if (
        !fileInput.files ||
        fileInput.files.length === 0
    ) {
        return;
    }

    if (status) {
        status.textContent =
            "Loading workbook...";

        status.classList.remove(
            "error-message"
        );
    }

    form.submit();
};


InventoryApp.exitApplication =
async function () {
    if (InventoryApp.isStrayTap()) {
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to close "
        + "Packaging Inventory Logger?"
    );

    if (!confirmed) {
        return;
    }

    const exitButton =
        document.getElementById(
            "exitApplicationButton"
        );

    if (exitButton) {
        exitButton.disabled = true;
        exitButton.textContent =
            "Closing...";
    }

    try {
        const response = await fetch(
            "/shutdown",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                },
            }
        );

        if (!response.ok) {
            let message =
                "The application could not be closed.";

            try {
                const data =
                    await response.json();

                if (data.message) {
                    message = data.message;
                }
            } catch (error) {
                // Keep the default message.
            }

            throw new Error(message);
        }

        document.body.innerHTML = `
            <main class="container">
                <section class="card">
                    <h1>Packaging Inventory Logger closed</h1>
                    <p>
                        The application has shut down.
                        You may now close this browser window.
                    </p>
                </section>
            </main>
        `;

        window.setTimeout(() => {
            window.close();
        }, 500);

    } catch (error) {
        window.alert(
            error.message ||
            "The application could not be closed."
        );

        if (exitButton) {
            exitButton.disabled = false;
            exitButton.textContent =
                "Exit Application";
        }
    }
};


document.addEventListener(
    "DOMContentLoaded",
    () => {
        const replacementPasswordInput =
            document.getElementById(
                "replaceUploadPassword"
            );

        if (replacementPasswordInput) {
            replacementPasswordInput.addEventListener(
                "keydown",
                event => {
                    if (event.key !== "Enter") {
                        return;
                    }

                    event.preventDefault();

                    InventoryApp
                        .validateReplacementPassword();
                }
            );

            replacementPasswordInput.addEventListener(
                "input",
                () => {
                    const status =
                        document.getElementById(
                            "replaceUploadStatus"
                        );

                    replacementPasswordInput
                        .classList.remove(
                            "input-error"
                        );

                    if (status) {
                        status.textContent = "";

                        status.classList.remove(
                            "error-message"
                        );
                    }
                }
            );
        }

        const downloadPasswordInput =
            document.getElementById(
                "downloadPassword"
            );

        if (downloadPasswordInput) {
            downloadPasswordInput.addEventListener(
                "keydown",
                event => {
                    if (event.key !== "Enter") {
                        return;
                    }

                    event.preventDefault();

                    InventoryApp
                        .validateDownloadPassword();
                }
            );

            downloadPasswordInput.addEventListener(
                "input",
                () => {
                    const status =
                        document.getElementById(
                            "downloadStatus"
                        );

                    downloadPasswordInput
                        .classList.remove(
                            "input-error"
                        );

                    if (status) {
                        status.textContent = "";

                        status.classList.remove(
                            "error-message"
                        );
                    }
                }
            );
        }

        const initialPasswordInput =
            document.getElementById(
                "initialUploadPassword"
            );

        if (initialPasswordInput) {
            initialPasswordInput.addEventListener(
                "keydown",
                event => {
                    if (event.key !== "Enter") {
                        return;
                    }

                    event.preventDefault();

                    InventoryApp
                        .validateInitialPassword();
                }
            );

            initialPasswordInput.addEventListener(
                "input",
                () => {
                    const status =
                        document.getElementById(
                            "initialUploadStatus"
                        );

                    initialPasswordInput
                        .classList.remove(
                            "input-error"
                        );

                    if (status) {
                        status.textContent = "";

                        status.classList.remove(
                            "error-message"
                        );
                    }
                }
            );
        }
    }
);