window.onload = function () {
  var gmarkers = [];
  var activeBizid = null;
  var map = null;
  var data = null;
  var infowindow = new google.maps.InfoWindow(
    {
      size: new google.maps.Size(800, 400),
      disableAutoPan: true
    });

  var markerClusterer = null;
  var gicon = new google.maps.MarkerImage(
    "imgs/marker_green.png",
    new google.maps.Size(20, 34),  // size
    new google.maps.Point(0, 0),   // origin
    new google.maps.Point(9, 34)   // anchor offset
  );


  // A function to create the marker and set up the event window
  function createMarker(latlng, name, html, bizid) {
    var contentString = html;
    var marker = new google.maps.Marker({
      position: latlng,
      icon: gicon,
      map: map,
      title: name,
      zIndex: Math.round(latlng.lat() * -100000) << 5
    });
    marker.myname = name;
    marker.bizid = bizid;
    gmarkers.push(marker);

    google.maps.event.addListener(marker, 'click', function () {
      infowindow.setContent(contentString);
      infowindow.open(map, marker);
      activeBizid = marker.bizid;
      updateActiveBookmark();
    });
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
      var bizinfo = null;
      // TODO: efficiently
      for (var j = 0; j < data.length; j++) {
        if (data[j]['bizid'] === gm.bizid) {
          bizinfo = data[j];
          break;
        }
      }

      html += '<a href="#" class="list-group-item" bizid="' + bizid + '">'
        + '<strong>' + bizinfo['name'] + '</strong> '
        + (bizinfo['address'] ? bizinfo['address'] : '') + '<br>'
        + starRating(bizinfo['rating']) + ' '
        + (bizinfo['price_range'] ? bizinfo['price_range'] : ' ') + ' '
        + categoriesText(bizinfo['categories'])
        + '</a>';
    }

    var bookmarks = $("#bookmarks").html(html).find('a');
    bookmarks.click(function () {
      var a = $(this);
      var bizid = a.attr('bizid');

      // TODO: efficiently
      for (var i = 0; i < gmarkers.length; i++) {
        var gm = gmarkers[i];
        if (gm.bizid === bizid) {
          google.maps.event.trigger(gmarkers[i], "click");
          break;
        }
      }
    });

    updateActiveBookmark();
  } // makeSidebar

  function starRating(rating) {
    if (!rating) {
      return '';
    }

    var pct = 100 * rating / 5;

    return '<div class="star-ratings" title="' + rating + ' stars">'
      + '<div class="star-ratings-top" style="width: ' + pct + '%"><span>&#9733;</span><span>&#9733;</span><span>&#9733;</span><span>&#9733;</span><span>&#9733;</span></div>'
      + '<div class="star-ratings-bottom"><span>&#9733;</span><span>&#9733;</span><span>&#9733;</span><span>&#9733;</span><span>&#9733;</span></div>'
      + '</div>';
  }

  function categoriesText(cats) {
    if (!cats) {
      return '';
    }

    return cats.join(', ');
  }

  function updateActiveBookmark() {
    var bookmarks = $("#bookmarks").find('a');
    bookmarks.removeClass('active');
    if (activeBizid) {
      var activeBookmark = bookmarks.filter(function () {
        return $(this).attr('bizid') === activeBizid;
      });

      if (activeBookmark.length) {
        activeBookmark.addClass('active');
        var activeBookmarkTop = activeBookmark.position().top;
        if (activeBookmarkTop > window.innerHeight || activeBookmarkTop < 0) {
          $('#sidebar').animate(
            {scrollTop: activeBookmarkTop - window.innerHeight / 2},
            'fast');
        }
      }
    }
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
      activeBizid = null;
      updateActiveBookmark();
    });

    // Fired when the map becomes idle after panning or zooming.
    google.maps.event.addListener(map, 'idle', function () {
      makeSidebar();
    });

    // Read the data
    $.getJSON("yelp-bookmarks.json", function (j) {
      data = j;

      // markers
      for (var i = 0; i < data.length; i++) {
        var lat = parseFloat(data[i]["latitude"]);
        var lng = parseFloat(data[i]["longitude"]);
        var point = new google.maps.LatLng(lat, lng);
        var name = data[i]["name"];
        var html = "<b>" + name + "<\/b><p>";
        var bizid = data[i]["bizid"];
        createMarker(point, name, html, bizid);
      }

      markerClusterer = new MarkerClusterer(
        map, gmarkers, {
          imagePath: 'imgs/cluster',
          imageSizes: [34],
          averageCenter: true,
          gridSize: 30,
          minimumClusterSize: 10
        });
    });

    $('#my-location').click(function () {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function (position) {
          map.setCenter(new google.maps.LatLng(
            position.coords.latitude,
            position.coords.longitude));
        });
      } else {
        $('#location-disabled').modal('show');
      }
    })
  }

  initialize();
};
