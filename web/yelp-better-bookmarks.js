window.onload = function () {
  var gmarkers = [];
  var map = null;
  var infowindow = new google.maps.InfoWindow(
    {
      size: new google.maps.Size(800, 400)
    });

  var gicon = new google.maps.MarkerImage(
    "imgs/marker_green.png",
    new google.maps.Size(20, 34),  // size
    new google.maps.Point(0, 0),   // origin
    new google.maps.Point(9, 34)   // anchor offset
  );

  var iconShadow = new google.maps.MarkerImage('http://www.google.com/mapfiles/shadow50.png',
    // The shadow image is larger in the horizontal dimension
    // while the position and offset are the same as for the main image.
    new google.maps.Size(37, 34),
    new google.maps.Point(0, 0),
    new google.maps.Point(9, 34));

  // A function to create the marker and set up the event window
  function createMarker(latlng, name, html, bizid, categories) {
    var contentString = html;
    var marker = new google.maps.Marker({
      position: latlng,
      icon: gicon,
      shadow: iconShadow,
      map: map,
      title: name,
      zIndex: Math.round(latlng.lat() * -100000) << 5
    });
    marker.myname = name;
    marker.bizid = bizid;
    marker.mycategories = categories;
    gmarkers.push(marker);

    google.maps.event.addListener(marker, 'click', function () {
      infowindow.setContent(contentString);
      infowindow.open(map, marker);
    });
  }

  function myclick(bizid) {
    // TODO: efficiently
    for (var i = 0; i < gmarkers.length; i++) {
      var gm = gmarkers[i];
      if (gm.bizid === bizid) {
        google.maps.event.trigger(gmarkers[i], "click");
        return;
      }
    }
  }

  // == rebuilds the sidebar to match the markers currently displayed ==
  function makeSidebar() {
    var bounds = map.getBounds();
    var distanceAndMarkers = [];
    var html = "";

    for (var i = 0; i < gmarkers.length; i++) {
      var gm = gmarkers[i];

      if (bounds.contains(gm.getPosition())) {
        var d = google.maps.geometry.spherical.computeDistanceBetween(
          map.center, gm.getPosition());

        distanceAndMarkers.push([d, gm]);
      }
    }

    distanceAndMarkers.sort();

    for (i = 0; i < distanceAndMarkers.length; i++) {
      gm = distanceAndMarkers[i][1];
      var bizid = gm.bizid;
      html += '<a href="#" class="list-group-item" bizid="' + bizid + '">' + gm.myname + '<\/a>';
    }

    $("#bookmarks").html(html).find('a').click(function () {
      myclick($(this).attr('bizid'));
    });
  }

  function initialize() {
    var myOptions = {
      zoom: 9,
      center: new google.maps.LatLng(51.76229204540854, -0.5259507324218515),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);

    google.maps.event.addListener(map, 'click', function () {
      infowindow.close();
    });

    // Fired when the map becomes idle after panning or zooming.
    google.maps.event.addListener(map, 'idle', function() {
        makeSidebar();
    });

    // Read the data
    $.getJSON("yelp-bookmarks.json", function (data) {
      // markers
      for (var i = 0; i < data.length; i++) {
        var lat = parseFloat(data[i]["latitude"]);
        var lng = parseFloat(data[i]["longitude"]);
        var point = new google.maps.LatLng(lat, lng);
        var name = data[i]["name"];
        var html = "<b>" + name + "<\/b><p>";
        var bizid = data[i]["biz_id"];
        var cats = data[i]["categories"];
        createMarker(point, name, html, bizid, cats);
      }
    });
  }

  initialize();
};
