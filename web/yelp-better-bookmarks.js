window.onload = function () {
  var gmarkers = [];
  var gicons = [];
  var map = null;
  var infowindow = new google.maps.InfoWindow(
    {
      size: new google.maps.Size(800, 400)
    });

  var colors = ["blue", "green", "red", "yellow"];
  var categories = {}; // name -> color

  for (var i = 0; i < colors.length; i++) {
    gicons[colors[i]] = new google.maps.MarkerImage(
      "marker_" + colors[i] + ".png",
      new google.maps.Size(20, 34),  // size
      new google.maps.Point(0, 0),   // origin
      new google.maps.Point(9, 34)); // anchor offset
  }

  var iconShadow = new google.maps.MarkerImage('http://www.google.com/mapfiles/shadow50.png',
    // The shadow image is larger in the horizontal dimension
    // while the position and offset are the same as for the main image.
    new google.maps.Size(37, 34),
    new google.maps.Point(0, 0),
    new google.maps.Point(9, 34));

  function getMarkerImage(iconColor) {
    if ((typeof(iconColor) === "undefined") || (iconColor === null)) {
      iconColor = "red";
    }
    if (!gicons[iconColor]) {
      gicons[iconColor] = new google.maps.MarkerImage("mapIcons/marker_" + iconColor + ".png",
        new google.maps.Size(20, 34),   // size
        new google.maps.Point(0, 0),    // origin
        new google.maps.Point(9, 34));  // anchor offset
    }

    return gicons[iconColor];
  }

  function category2color(category) {
    if (!categories[category] === undefined) {
      return categories[category];
    }

    return "red";
  }

  // A function to create the marker and set up the event window
  function createMarker(latlng, name, html, category) {
    var contentString = html;
    var marker = new google.maps.Marker({
      position: latlng,
      icon: gicons[category],
      shadow: iconShadow,
      map: map,
      title: name,
      zIndex: Math.round(latlng.lat() * -100000) << 5
    });
    // === Store the category and name info as a marker properties ===
    marker.mycategory = category;
    marker.myname = name;
    gmarkers.push(marker);

    google.maps.event.addListener(marker, 'click', function () {
      infowindow.setContent(contentString);
      infowindow.open(map, marker);
    });
  }

  // == shows all markers of a particular category, and ensures the checkbox is checked ==
  function show(category) {
    for (var i = 0; i < gmarkers.length; i++) {
      if (gmarkers[i].mycategory === category) {
        gmarkers[i].setVisible(true);
      }
    }
    // == check the checkbox ==
    document.getElementById(category + "box").checked = true;
  }

  // == hides all markers of a particular category, and ensures the checkbox is cleared ==
  function hide(category) {
    for (var i = 0; i < gmarkers.length; i++) {
      if (gmarkers[i].mycategory === category) {
        gmarkers[i].setVisible(false);
      }
    }
    // == clear the checkbox ==
    document.getElementById(category + "box").checked = false;
    // == close the info window, in case its open on a marker that we just hid
    infowindow.close();
  }

  // == a checkbox has been clicked ==
  function boxclick(box, category) {
    if (box.checked) {
      show(category);
    } else {
      hide(category);
    }
    // == rebuild the side bar
    makeSidebar();
  }

  function myclick(i) {
    google.maps.event.trigger(gmarkers[i], "click");
  }

  // == rebuilds the sidebar to match the markers currently displayed ==
  function makeSidebar() {
    var html = "";
    for (var i = 0; i < gmarkers.length; i++) {
      if (gmarkers[i].getVisible()) {
        html += '<a href="#" class="list-group-item" marker-id="' + i + '">' + gmarkers[i].myname + '<\/a>';
      }
    }
    $("#bookmarks").html(html).find('a').click(function () {
      myclick(parseInt($(this).attr('marker-id')));
    });
  }

  function initialize() {
    var myOptions = {
      zoom: 11,
      center: new google.maps.LatLng(53.8363, -3.0377),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);

    google.maps.event.addListener(map, 'click', function () {
      infowindow.close();
    });

    // Read the data
    $.getJSON("yelp-bookmarks.json", function (markers) {
      var colorIndex = 0;

      // categories
      for (var i = 0; i < markers.length; i++) {
        var category = markers[i]["category"];
        if (categories[category] === undefined) {
          categories[category] = colors[colorIndex];
          colorIndex = (colorIndex + 1) % colors.length;
        }
      }

      // markers
      for (i = 0; i < markers.length; i++) {
        var lat = parseFloat(markers[i]["latitude"]);
        var lng = parseFloat(markers[i]["longitude"]);
        var point = new google.maps.LatLng(lat, lng);
        var name = markers[i]["name"];
        var html = "<b>" + name + "<\/b><p>";
        category = markers[i]["category"];
        // create the marker
        createMarker(point, name, html, category);
      }
      // == create the initial sidebar ==
      makeSidebar();
    });
  }

  initialize();
};
