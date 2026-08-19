InventoryApp.dismissCountKeypad = function () {
    const countInput =
        document.getElementById("countInput");

    if (!countInput) {
        return;
    }

    /*
     * Temporarily disable the software keyboard.
     */
    countInput.readOnly = true;
    countInput.setAttribute("inputmode", "none");
    countInput.blur();

    /*
     * Move focus to a non-input element.
     * Android browsers often require focus to move somewhere else.
     */
    let focusTarget =
        document.getElementById(
            "keyboardDismissTarget"
        );

    if (!focusTarget) {
        focusTarget =
            document.createElement("button");

        focusTarget.id =
            "keyboardDismissTarget";

        focusTarget.type = "button";
        focusTarget.tabIndex = -1;
        focusTarget.setAttribute(
            "aria-hidden",
            "true"
        );

        focusTarget.style.position = "fixed";
        focusTarget.style.left = "-10000px";
        focusTarget.style.top = "-10000px";
        focusTarget.style.width = "1px";
        focusTarget.style.height = "1px";
        focusTarget.style.opacity = "0";
        focusTarget.style.pointerEvents = "none";

        document.body.appendChild(
            focusTarget
        );
    }

    focusTarget.focus({
        preventScroll: true,
    });

    /*
     * Restore the field without focusing it.
     * The operator can tap it again for another count.
     */
    window.setTimeout(() => {
        countInput.readOnly = false;
        countInput.setAttribute(
            "inputmode",
            "decimal"
        );
    }, 500);
};

InventoryApp.saveCount = async function () {
    if (!InventoryApp.selectedItem) {
        return;
    }

    const saveStatus =
        document.getElementById("saveStatus");

    const countInput =
        document.getElementById("countInput");

    const count =
        InventoryApp.getValidCount(
            "countInput",
            saveStatus
        );

    if (count === null) {
        return;
    }

    /*
     * Dismiss the Keyence/Android number pad immediately.
     */
    if (countInput) {
        countInput.readOnly = true;
        countInput.setAttribute(
            "inputmode",
            "none"
        );
        countInput.blur();
    }

    /*
     * Move focus completely away from the number input.
     * This helps Android-based handheld browsers close
     * the software keypad.
     */
    let dismissTarget =
        document.getElementById(
            "keyboardDismissTarget"
        );

    if (!dismissTarget) {
        dismissTarget =
            document.createElement("button");

        dismissTarget.id =
            "keyboardDismissTarget";

        dismissTarget.type = "button";
        dismissTarget.tabIndex = -1;

        dismissTarget.setAttribute(
            "aria-hidden",
            "true"
        );

        dismissTarget.style.position =
            "fixed";

        dismissTarget.style.left =
            "-10000px";

        dismissTarget.style.top =
            "-10000px";

        dismissTarget.style.width =
            "1px";

        dismissTarget.style.height =
            "1px";

        dismissTarget.style.opacity =
            "0";

        dismissTarget.style.pointerEvents =
            "none";

        document.body.appendChild(
            dismissTarget
        );
    }

    try {
        dismissTarget.focus({
            preventScroll: true,
        });
    } catch (error) {
        dismissTarget.focus();
    }

    const saveButton =
        document.getElementById(
            "saveCountButton"
        ) ||
        document.querySelector(
            "#selectedCard .button-row button"
        );

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
    }

    let saveSucceeded = false;

    /*
     * Keep the item details, because returnToSearch
     * clears the current selection.
     */
    const countedItem = {
        item_number:
            InventoryApp
                .selectedItem
                .item_number,

        product_name:
            InventoryApp
                .selectedItem
                .product_name || "",
    };

    try {
        const response = await fetch(
            "/api/save-count",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                },
                body: JSON.stringify({
                    item_number:
                        InventoryApp
                            .selectedItem
                            .item_number,
                    count,
                    source: "manual",
                }),
            }
        );

        const data =
            await response.json();

        if (!response.ok || !data.ok) {
            saveStatus.textContent =
                data.error ||
                "Save failed.";

            return;
        }

        saveSucceeded = true;

        /*
         * The count is stored, so close the item and
         * go straight back to search for the next one.
         */
        InventoryApp.returnToSearch(
            `Added ${data.entry.count} for ` +
            `${data.item_number}. ` +
            `New total: ${data.item_total}.`,
            countedItem
        );

    } catch (error) {
        console.error(error);

        saveStatus.textContent =
            "Could not connect to the server.";

    } finally {
        /*
         * Restore the count field for the next selection.
         * After a successful save the search field already
         * holds focus, so leave it alone.
         */
        window.setTimeout(() => {
            if (countInput) {
                countInput.readOnly = false;

                countInput.setAttribute(
                    "inputmode",
                    "decimal"
                );
            }

            if (saveSucceeded) {
                return;
            }

            if (countInput) {
                countInput.blur();
            }

            try {
                dismissTarget.focus({
                    preventScroll: true,
                });
            } catch (error) {
                dismissTarget.focus();
            }
        }, 500);

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent =
                "Add Count Entry";
        }
    }
};

InventoryApp.updateSelectedEntryCount =
function (entryCount) {
    const entryCountElement =
        document.getElementById(
            "selectedEntryCount"
        );

    if (!entryCountElement) {
        return;
    }

    entryCountElement.textContent =
        `Number of entries: ${entryCount}`;
};


InventoryApp.loadSelectedItemEntryCount =
async function () {
    if (!InventoryApp.selectedItem) {
        return;
    }

    const entryCountElement =
        document.getElementById(
            "selectedEntryCount"
        );

    if (entryCountElement) {
        entryCountElement.textContent =
            "Number of entries: Loading...";
    }

    try {
        const itemNumber =
            InventoryApp
                .selectedItem
                .item_number;

        const response = await fetch(
            `/api/entries?item_number=${
                encodeURIComponent(itemNumber)
            }`
        );

        const data = await response.json();

        if (!response.ok) {
            if (entryCountElement) {
                entryCountElement.textContent =
                    "Number of entries: —";
            }

            return;
        }

        const entries =
            data.entries || [];

        InventoryApp.updateSelectedEntryCount(
            entries.length
        );

    } catch (error) {
        console.error(error);

        if (entryCountElement) {
            entryCountElement.textContent =
                "Number of entries: —";
        }
    }
};


InventoryApp.toggleSelectedItemEntries =
function () {
    const wrapper =
        document.getElementById(
            "selectedItemEntriesWrapper"
        );

    if (!wrapper) {
        return;
    }

    wrapper.classList.toggle("hidden");

    if (!wrapper.classList.contains("hidden")) {
        InventoryApp
            .loadEntriesForSelectedItem();
    }
};


InventoryApp.loadEntriesForSelectedItem =
async function () {
    if (!InventoryApp.selectedItem) {
        return;
    }

    const entriesDiv =
        document.getElementById(
            "selectedItemEntries"
        );

    if (!entriesDiv) {
        return;
    }

    entriesDiv.innerHTML =
        "<p>Loading entries...</p>";

    try {
        const itemNumber =
            InventoryApp
                .selectedItem
                .item_number;

        const response = await fetch(
            `/api/entries?item_number=${
                encodeURIComponent(itemNumber)
            }`
        );

        const data = await response.json();

        if (!response.ok) {
            entriesDiv.textContent =
                data.error ||
                "Could not load entries.";

            return;
        }

        const entries = data.entries || [];

        InventoryApp.updateSelectedEntryCount(
            entries.length
        );

        entriesDiv.innerHTML = "";

        if (!entries.length) {
            entriesDiv.innerHTML =
                "<p>No entries for this item yet.</p>";

            return;
        }

        entries.forEach(entry => {
            const entryItem =
                document.createElement("div");

            entryItem.className = "entry-item";

            entryItem.innerHTML = `
                <div class="result-main">
                    ${InventoryApp.escapeHtml(entry.count)}
                </div>

                <div class="entry-sub">
                    ${InventoryApp.escapeHtml(entry.timestamp)}
                    | Source:
                    ${InventoryApp.escapeHtml(entry.source)}
                </div>

                <div class="entry-actions">
                    <input
                        id="edit-${InventoryApp.escapeHtml(entry.id)}"
                        type="number"
                        min="0"
                        step="any"
                        inputmode="decimal"
                        value="${InventoryApp.escapeHtml(entry.count)}"
                    >

                    <button
                        type="button"
                        onclick="InventoryApp.updateEntry('${InventoryApp.escapeHtml(entry.id)}')"
                    >
                        Update Entry
                    </button>

                    <button
                        type="button"
                        class="danger"
                        onclick="InventoryApp.deleteEntry('${InventoryApp.escapeHtml(entry.id)}')"
                    >
                        Delete Entry
                    </button>
                </div>
            `;

            entriesDiv.appendChild(entryItem);
        });

    } catch (error) {
        console.error(error);

        entriesDiv.textContent =
            "Could not connect to the server.";
    }
};


InventoryApp.deleteEntry =
async function (id) {
    const confirmed = confirm(
        "Delete this input entry?"
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            "/api/delete-entry",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                },
                body: JSON.stringify({
                    id,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
            alert(
                data.error || "Delete failed."
            );

            return;
        }

        if (
            InventoryApp.selectedItem &&
            data.item_number ===
                InventoryApp.selectedItem.item_number
        ) {
            InventoryApp.selectedItem.counted =
                data.item_total;

            document.getElementById(
                "selectedExistingCount"
            ).textContent =
                `Current counted total: ` +
                `${data.item_total}`;
        }

        await InventoryApp
            .loadEntriesForSelectedItem();

    } catch (error) {
        console.error(error);

        alert(
            "Could not connect to the server."
        );
    }
};


InventoryApp.updateEntry =
async function (id) {
    const input =
        document.getElementById(`edit-${id}`);

    if (!input) {
        alert(
            "Entry input could not be found."
        );

        return;
    }

    const rawValue = input.value.trim();

    if (!rawValue) {
        alert("Count is required.");

        return;
    }

    const count = Number(rawValue);

    if (!Number.isFinite(count)) {
        alert("Count must be a number.");

        return;
    }

    if (count <= 0) {
        alert("Count must be greater than 0.");

        return;
    }

    const entryContainer =
        input.closest(".entry-actions");

    const updateButton =
        entryContainer
            ? entryContainer.querySelector(
                "button:not(.danger)"
            )
            : null;

    if (updateButton) {
        updateButton.disabled = true;
        updateButton.textContent =
            "Updating...";
    }

    try {
        const response = await fetch(
            "/api/update-entry",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                },
                body: JSON.stringify({
                    id,
                    count,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
            alert(
                data.error || "Update failed."
            );

            return;
        }

        if (
            InventoryApp.selectedItem &&
            data.item_number ===
                InventoryApp.selectedItem.item_number
        ) {
            InventoryApp.selectedItem.counted =
                data.item_total;

            document.getElementById(
                "selectedExistingCount"
            ).textContent =
                `Current counted total: ` +
                `${data.item_total}`;
        }

        input.blur();

        if (
            document.activeElement &&
            typeof document.activeElement.blur === "function"
        ) {
            document.activeElement.blur();
        }

        await InventoryApp
            .loadEntriesForSelectedItem();

    } catch (error) {
        console.error(error);

        alert(
            "Could not connect to the server."
        );

    } finally {
        if (updateButton) {
            updateButton.disabled = false;
            updateButton.textContent =
                "Update Entry";
        }
    }
};

document.addEventListener(
    "DOMContentLoaded",
    () => {
        const countInput =
            document.getElementById(
                "countInput"
            );

        const saveButton =
            document.getElementById(
                "saveCountButton"
            );

        /*
         * Save immediately when the button is touched.
         * This avoids the Keyence browser consuming the
         * first tap only to close the keypad.
         */
        if (saveButton) {
            saveButton.addEventListener(
                "pointerdown",
                event => {
                    event.preventDefault();

                    InventoryApp.saveCount();
                }
            );

            /*
             * Prevent a second save from the click event
             * that may follow pointerdown.
             */
            saveButton.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                }
            );
        }

        if (!countInput) {
            return;
        }

        countInput.addEventListener(
            "keydown",
            event => {
                if (event.key !== "Enter") {
                    return;
                }

                event.preventDefault();

                InventoryApp.saveCount();
            }
        );
    }
);