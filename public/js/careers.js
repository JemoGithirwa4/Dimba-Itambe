$(document).ready(function () {
    $("#searchInputCareer").on("keyup", function () {  // Fixed ID
        let filter = $(this).val().toLowerCase();

        $(".job-item").each(function () { // Fixed selector
            let jobTitle = $(this).find(".job-title").text().toLowerCase().trim();
            let jobDescription = $(this).find(".job-description").text().toLowerCase().trim();

            if (jobTitle.includes(filter) || jobDescription.includes(filter)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });
});
