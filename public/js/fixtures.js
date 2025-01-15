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
});
