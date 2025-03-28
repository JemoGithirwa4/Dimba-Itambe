$(document).ready(function () {
    $("#searchPlayers").on("keyup", function () {
        let filter = $(this).val().toLowerCase().trim();

        $(".featured-player-card").each(function () {
            let playerName = $(this).find("h3").text().toLowerCase().trim(); // Player Name
            let teamName = $(this).find(".d-none").text().toLowerCase().trim(); // Hidden Team Name

            if (playerName.includes(filter) || teamName.includes(filter)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });
});