$(document).ready(function () {
    $("#searchInput").on("keyup", function () {
        let filter = $(this).val().toLowerCase();

        $(".club-card").each(function () {
            let teamName = $(this).find(".card-title").text().toLowerCase().trim(); // Club Name

            if (teamName.includes(filter)) {
                $(this).closest(".col-md-3").show();
            } else {
                $(this).closest(".col-md-3").hide();
            }
        });
    });
});
