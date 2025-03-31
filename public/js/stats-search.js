$(document).ready(function () {
    $("#searchPlayersStat").on("keyup", function () {
        let filter = $(this).val().toLowerCase();

        $("tbody tr").each(function () {
            let playerName = $(this).find("td:nth-child(2)").text().toLowerCase().trim(); // Player Name column

            if (playerName.includes(filter)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });
});
