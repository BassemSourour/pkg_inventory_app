InventoryApp.chooseReplacementWorkbook =
function () {
    const confirmed = confirm(
        "Replacing the Excel file will erase " +
        "all counts from the current session. " +
        "Continue?"
    );

    if (!confirmed) {
        return;
    }

    const fileInput =
        document.getElementById(
            "replaceFileInput"
        );

    if (!fileInput) {
        alert(
            "The file picker could not be opened."
        );
        return;
    }

    fileInput.value = "";
    fileInput.click();
};


document.addEventListener(
    "DOMContentLoaded",
    () => {
        const fileInput =
            document.getElementById(
                "replaceFileInput"
            );

        if (!fileInput) {
            return;
        }

        fileInput.addEventListener(
            "change",
            () => {
                if (!fileInput.files.length) {
                    return;
                }

                const selectedFile =
                    fileInput.files[0];

                if (
                    !selectedFile.name
                        .toLowerCase()
                        .endsWith(".xlsx")
                ) {
                    alert(
                        "Please select an Excel file " +
                        "ending in .xlsx."
                    );

                    fileInput.value = "";

                    return;
                }

                document.getElementById(
                    "replaceWorkbookForm"
                )?.submit();
            }
        );
    }
);