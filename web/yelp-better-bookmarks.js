window.onload = function () {
  var gmarkers = [];
  var bizid2gmarker = {};
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
    bizid2gmarker[bizid] = marker;

    google.maps.event.addListener(marker, 'click', function () {
      infowindow.setContent(contentString);
      infowindow.open(map, marker);
      activeBizid = marker.bizid;
      updateActiveBookmark();
      return false;
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
        + '<i class="goto-yelp material-icons" title="Open in Yelp" yelp-url="' + bizinfo['url'] + '">open_in_new</i>'
        + '</a>';
    }

    var bookmarks = $("#bookmarks").html(html).find('a');
    bookmarks.click(function () {
      var a = $(this);
      var bizid = a.attr('bizid');

      var gm = bizid2gmarker[bizid];
      google.maps.event.trigger(gm, "click");

      return false;
    });

    bookmarks.find('.goto-yelp').click(function () {
      window.open($(this).attr('yelp-url'), "_blank");
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
        var sidebar = $('#sidebar');
        var activeBookmarkTop = activeBookmark.position().top;
        if (activeBookmarkTop > window.innerHeight || activeBookmarkTop < 0) {
          var scrollTop = sidebar.scrollTop() + activeBookmarkTop - window.innerHeight / 2;
          $('#sidebar').animate(
            {scrollTop: scrollTop},
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
      return false;
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
        var bizid = data[i]["bizid"];
        var html = '<a href="' + data[i]['url'] + '" target="_blank"><b>' + name + '<\/b></a>';
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

    var locationButton = $('#my-location');
    locationButton.click(function () {
      if ("geolocation" in navigator) {
        var pulsating = true;

        function pulsate() {
          if (!pulsating) {
            return;
          }

          locationButton.animate({opacity: 0.2}, 500, 'linear').animate({opacity: 1}, 500, 'linear', pulsate);
        }

        pulsate();

        navigator.geolocation.getCurrentPosition(function (position) {
          locationButton.stop();
          pulsating = false;
          map.setCenter(new google.maps.LatLng(
            position.coords.latitude,
            position.coords.longitude));
        });
      } else {
        $('#location-disabled').modal('show');
      }

      return false;
    });

    $('#bookmarks').sieve({
      itemSelector: "a.list-group-item",
      searchInput: $("#search").find("input")
    });
  }

  initialize();
};
