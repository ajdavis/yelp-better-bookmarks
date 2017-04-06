window.onload = function () {
  var gmarkers = [];
  var bizid2info = {};
  var bizid2gmarker = {};
  var activeBizid = null;
  var map = null;
  var geocoder = null;
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

  function clusterForBizid(bizid) {
    var clusters = markerClusterer.getClusters();
    for (var i = 0, l = clusters.length; i < l; i++) {
      for (var j = 0, le = clusters[i].markers_.length; j < le; j++) {
        if (clusters[i].markers_[j].bizid === bizid) {
          return clusters[i];
        }
      }
    }
  }

  function fixupInfoWindow() {
    if (activeBizid) {
      var gm = bizid2gmarker[activeBizid];
      if (gm.map) {
        infowindow.open(map, gm);
      } else {
        // hidden by the MarkerClusterer - attach info window to cluster
        var cluster = clusterForBizid(activeBizid);
        if (cluster) {
          infowindow.setPosition(cluster.getCenter());
          infowindow.open(map);
        }
      }
    }
  }

  function offsetLatPixels(latlng, offsety) {
    // latlng is the apparent centre-point
    // offsetx is the distance you want that point to move to the right, in pixels
    // offsety is the distance you want that point to move upwards, in pixels
    // offset can be negative
    // offsetx and offsety are both optional

    var scale = Math.pow(2, map.getZoom());
    var pxPoint = map.getProjection().fromLatLngToPoint(latlng);
    var pxOffset = new google.maps.Point(0, (offsety / scale) || 0);
    var worldCoordsPoint = new google.maps.Point(
      pxPoint.x - pxOffset.x,
      pxPoint.y + pxOffset.y);

    return map.getProjection().fromPointToLatLng(worldCoordsPoint);
  }

  // == rebuilds the sidebar to match the markers currently displayed ==
  function makeSidebar() {
    var bounds = map.getBounds();

    // A marker's top can peek above the lower edge of the map, but because it's
    // not within bounds its bookmark isn't added to the sidebar.
    var newSouthWest = offsetLatPixels(
      bounds.getSouthWest(),
      34 /* marker height */);

    bounds = bounds.extend(newSouthWest);

    var ratingsAndMarkers = [];
    var bizid;
    var bizinfo;
    var html = "";

    for (var i = 0; i < gmarkers.length; i++) {
      var gm = gmarkers[i];
      bizid = gm.bizid;
      bizinfo = bizid2info[bizid];

      if (bounds.contains(gm.getPosition())) {
        ratingsAndMarkers.push([bizinfo['rating'], gm]);
      }
    }

    // highest-rated first
    ratingsAndMarkers.sort(function (a, b) {
      var ratingA = a[0], ratingB = b[0];
      if (isNaN(ratingA)) {
        return 1;
      }

      if (isNaN(ratingB)) {
        return -1;
      }

      return ratingB - ratingA;
    });

    for (i = 0; i < ratingsAndMarkers.length; i++) {
      gm = ratingsAndMarkers[i][1];
      bizid = gm.bizid;
      bizinfo = bizid2info[bizid];

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
      if (gm.map) {
        // calls updateActiveBookmark
        google.maps.event.trigger(gm, "click");
      } else {
        // hidden by the MarkerClusterer - zoom into the cluster
        var cluster = clusterForBizid(bizid);
        var clusterBounds = cluster.getBounds();
        setTimeout(function () {
          map.setZoom(14);
          map.fitBounds(clusterBounds);

          // calls updateActiveBookmark
          google.maps.event.trigger(gm, "click");
        }, 100);
      }

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
      zoom: 11,
      center: new google.maps.LatLng(40.7575067, -73.9877717),
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
      fixupInfoWindow();
    });

    geocoder = new google.maps.Geocoder();

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
        bizid2info[bizid] = data[i];
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

      google.maps.event.addListener(markerClusterer, 'clusteringend', function () {
        fixupInfoWindow();
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

    var geocodeInput = $('#geocode').find('input');
    geocodeInput.keydown(function (e) {
      if (e.keyCode === 13) {
        geocoder.geocode(
          {address: geocodeInput.val()},
          function (results, status) {
            if (status === 'OK') {
              map.setCenter(results[0].geometry.location);
              infowindow.setPosition(results[0].geometry.location);
              infowindow.setContent(results[0].formatted_address);
              infowindow.open(map);
            } else {
              var geocodeFailed = $('#geocode-failed');
              geocodeFailed.find('.modal-body').text(status);
              geocodeFailed.modal('show');
            }
          }
        );
      }
    });
  }

  initialize();
};
