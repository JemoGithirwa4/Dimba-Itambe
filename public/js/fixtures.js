$(document).ready(function () {
  $(".fix-nav").on("click", function (event) {
      event.preventDefault();

      // Remove active class from all tabs and add to the clicked one
      $(".fix-nav").removeClass("active");
      $(this).addClass("active");

      // Hide all sections and show the target section
      const targetId = $(this).data("target");
      if (targetId) {
          $(".fix-section").hide(); // Ensure sections have this class
          $("#" + targetId).fadeIn();
      }
  });

  $("#searchFixtures").on("keyup", function () {
    let filter = $(this).val().toLowerCase();

    // Filter fixtures
    $(".match-card").each(function () {
        let homeTeam = $(this).find(".home-team").text().toLowerCase();
        let awayTeam = $(this).find(".away-team").text().toLowerCase();
        let hostedBy = $(this).find(".hosted-by").text().toLowerCase();

        if (homeTeam.includes(filter) || awayTeam.includes(filter) || hostedBy.includes(filter)) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });

    // Filter results
    $(".res-holder").each(function () {
        let homeTeam = $(this).find(".home-team").text().toLowerCase();
        let awayTeam = $(this).find(".away-team").text().toLowerCase();

        if (homeTeam.includes(filter) || awayTeam.includes(filter)) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
  });

  $("#searchResults").on("keyup", function () {
    let filter = $(this).val().toLowerCase();

    // Filter results
    $(".res-holder").each(function () {
        let homeTeam = $(this).find(".home-team").text().toLowerCase();
        let awayTeam = $(this).find(".away-team").text().toLowerCase();

        if (homeTeam.includes(filter) || awayTeam.includes(filter)) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
  });
});
