// TODO add callback handler for clicked marker callouts
var utils = require("utils/utils");
var application = require("application");
var frame = require("ui/frame");
var mapbox = require("./mapbox-common");
var ACCESS_FINE_LOCATION_PERMISSION_REQUEST_CODE = 111;

mapbox._fineLocationPermissionGranted = function () {
  var hasPermission = android.os.Build.VERSION.SDK_INT < 23; // Android M. (6.0)
  if (!hasPermission) {
    hasPermission = android.content.pm.PackageManager.PERMISSION_GRANTED ==
    android.support.v4.content.ContextCompat.checkSelfPermission(application.android.foregroundActivity, android.Manifest.permission.ACCESS_FINE_LOCATION);
  }
  return hasPermission;
};

mapbox.hasFineLocationPermission = function () {
  return new Promise(function (resolve) {
    resolve(mapbox._fineLocationPermissionGranted());
  });
};

mapbox.requestFineLocationPermission = function () {
  return new Promise(function (resolve) {
    if (!mapbox._fineLocationPermissionGranted()) {
      // in a future version we could hook up the callback and change this flow a bit
      android.support.v4.app.ActivityCompat.requestPermissions(
          application.android.foregroundActivity,
          [android.Manifest.permission.ACCESS_FINE_LOCATION],
          ACCESS_FINE_LOCATION_PERMISSION_REQUEST_CODE);
      // this is not the nicest solution as the user needs to initiate scanning again after granting permission,
      // so enhance this in a future version, but it's ok for now
      resolve();
    }
  });
};

mapbox._getMapStyle = function(input) {
  var Style = com.mapbox.mapboxsdk.constants.Style;
  if (input === mapbox.MapStyle.LIGHT) {
    return Style.LIGHT;
  } else if (input === mapbox.MapStyle.DARK) {
    return Style.DARK;
  } else if (input === mapbox.MapStyle.EMERALD) {
    return Style.EMERALD;
  } else if (input === mapbox.MapStyle.SATELLITE) {
    return Style.SATELLITE;
  } else {
    // default
    return Style.MAPBOX_STREETS;
  }
};

mapbox.show = function(arg) {
  return new Promise(function (resolve, reject) {
    try {
      var settings = mapbox.merge(arg, mapbox.defaults);

      // if no accessToken was set the app may crash
      if (settings.accessToken === undefined) {
        reject("Please set the 'accessToken' parameter");
        return;
      }

      mapView = new com.mapbox.mapboxsdk.views.MapView(application.android.context, settings.accessToken);
      mapView.onResume();
      mapView.onCreate(null);
      mapView.setStyleUrl(mapbox._getMapStyle(settings.style));

      var topMostFrame = frame.topmost(),
          density = utils.layout.getDisplayDensity(),
          left = settings.margins.left * density,
          right = settings.margins.right * density,
          top = settings.margins.top * density,
          bottom = settings.margins.bottom * density,
          viewWidth = topMostFrame.currentPage.android.getWidth(),
          viewHeight = topMostFrame.currentPage.android.getHeight();

      var params = new android.widget.FrameLayout.LayoutParams(viewWidth - left - right, viewHeight - top - bottom);
      params.setMargins(left, top, right, bottom);
      mapView.setLayoutParams(params);

      if (settings.center) {
        mapView.setCenterCoordinate(new com.mapbox.mapboxsdk.geometry.LatLngZoom(settings.center.lat, settings.center.lng, settings.zoomLevel));
      } else {
        mapView.setZoomLevel(settings.zoomLevel);
      }

      mapView.setCompassEnabled(!settings.hideCompass);
      mapView.setRotateEnabled(!settings.disableRotation);
      mapView.setScrollEnabled(!settings.disableScroll);
      mapView.setZoomEnabled(!settings.disableZoom);
      mapView.setTiltEnabled(!settings.disableTilt);

      if (settings.showUserLocation) {
        if (mapbox._fineLocationPermissionGranted()) {
          mapView.setMyLocationEnabled(true);
        } else {
          // devs should ask permission upfront, otherwise enabling location will crash the app on Android 6
          console.log("Mapbox plugin: not showing the user location on this device because persmission was not requested/granted");
        }
      }

      // if we want to hide this, just render it outside the view
      if (settings.hideAttribution) {
        mapView.setAttributionMargins(-300,0,0,0);
      }
      // same can be done for the logo
      if (settings.hideLogo) {
        mapView.setLogoMargins(-300,0,0,0);
      }

      var activity = application.android.foregroundActivity;
      var mapViewLayout = new android.widget.FrameLayout(activity);
      mapViewLayout.addView(mapView);
      topMostFrame.currentPage.android.getParent().addView(mapViewLayout);

      if (settings.markers) {
        for (var m in settings.markers) {
          var marker = settings.markers[m];
          var markerOptions = new com.mapbox.mapboxsdk.annotations.MarkerOptions();
          markerOptions.title(marker.title);
          markerOptions.snippet(marker.subtitle);
          markerOptions.position(new com.mapbox.mapboxsdk.geometry.LatLng(marker.lat, marker.lng));
          mapView.addMarker(markerOptions);
        }
      }

      resolve();
    } catch (ex) {
      console.log("Error in mapbox.show: " + ex);
      reject(ex);
    }
  });
};

mapbox.hide = function(arg) {
  return new Promise(function (resolve, reject) {
    try {
      var viewGroup = mapView.getParent();
      if (viewGroup !== null) {
        viewGroup.removeView(mapView);
      }
      resolve();
    } catch (ex) {
      console.log("Error in mapbox.show: " + ex);
      reject(ex);
    }
  });
};

mapbox.addMarkers = function (markers) {
  return new Promise(function (resolve, reject) {
    try {
      for (var m in markers) {
        var marker = markers[m];
        var markerOptions = new com.mapbox.mapboxsdk.annotations.MarkerOptions();
        markerOptions.title(marker.title);
        markerOptions.snippet(marker.subtitle);
        markerOptions.position(new com.mapbox.mapboxsdk.geometry.LatLng(marker.lat, marker.lng));
        mapView.addMarker(markerOptions);
      }
      resolve();
    } catch (ex) {
      console.log("Error in mapbox.addMarkers: " + ex);
      reject(ex);
    }
  });
};

mapbox.setCenter = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      var animated = arg.animated || true;
      var lat = arg.lat;
      var lng = arg.lng;
      mapView.setCenterCoordinate(new com.mapbox.mapboxsdk.geometry.LatLng(lat, lng), animated);
      resolve();
    } catch (ex) {
      console.log("Error in mapbox.setCenter: " + ex);
      reject(ex);
    }
  });
};

mapbox.getCenter = function () {
  return new Promise(function (resolve, reject) {
    try {
      var coordinate = mapView.getCenterCoordinate();
      resolve({
        lat: coordinate.getLatitude(),
        lng: coordinate.getLongitude()
      });
    } catch (ex) {
      console.log("Error in mapbox.getCenter: " + ex);
      reject(ex);
    }
  });
};

mapbox.setZoomLevel = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      var animated = arg.animated || true;
      var level = arg.level;
      if (level >=0 && level <= 20) {
        mapView.setZoomLevel(level, animated);
        resolve();
      } else {
        reject("invalid zoomlevel, use any double value from 0 to 20 (like 8.3)");
      }
    } catch (ex) {
      console.log("Error in mapbox.setZoomLevel: " + ex);
      reject(ex);
    }
  });
};

mapbox.getZoomLevel = function () {
  return new Promise(function (resolve, reject) {
    try {
      var level = mapView.getZoomLevel();
      resolve(level);
    } catch (ex) {
      console.log("Error in mapbox.getZoomLevel: " + ex);
      reject(ex);
    }
  });
};

mapbox.setTilt = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      mapView.setTilt(
        new java.lang.Double(arg.pitch || 30),
        new java.lang.Long(arg.duration || 5000));
      resolve();
    } catch (ex) {
      console.log("Error in mapbox.setTilt: " + ex);
      reject(ex);
    }
  });
};

mapbox.getTilt = function () {
  return new Promise(function (resolve, reject) {
    try {
      var tilt = mapView.getTilt();
      resolve(tilt);
    } catch (ex) {
      console.log("Error in mapbox.getTilt: " + ex);
      reject(ex);
    }
  });
};

mapbox.animateCamera = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      
      var target = arg.target;
      if (target === undefined) {
        reject("Please set the 'target' parameter");
        return;
      }
      
      var cameraPositionBuilder = new com.mapbox.mapboxsdk.camera.CameraPosition.Builder()
            .target(new com.mapbox.mapboxsdk.geometry.LatLng(target.lat, target.lng));
      
      if (arg.bearing) {
        cameraPositionBuilder.bearing(arg.bearing);
      }

      if (arg.tilt) {
        cameraPositionBuilder.bearing(arg.tilt);
      }

      if (arg.zoomLevel) {
        cameraPositionBuilder.zoom(arg.zoomLevel);
      }

      mapView.animateCamera(
          com.mapbox.mapboxsdk.camera.CameraUpdateFactory.newCameraPosition(cameraPositionBuilder.build()),
          (arg.duration ? arg.duration : 15) * 1000, // default 15 seconds
          null);

      resolve();
    } catch (ex) {
      console.log("Error in mapbox.animateCamera: " + ex);
      reject(ex);
    }
  });
};

mapbox.addPolygon = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      var points = arg.points;
      if (points === undefined) {
        reject("Please set the 'points' parameter");
        return;
      }

      var polygonOptions = new com.mapbox.mapboxsdk.annotations.PolygonOptions();
      for (var p in points) {
        var point = points[p];
        polygonOptions.add(new com.mapbox.mapboxsdk.geometry.LatLng(point.lat, point.lng));
      }
      mapView.addPolygon(polygonOptions);
      resolve();
    } catch (ex) {
      console.log("Error in mapbox.addPolygon: " + ex);
      reject(ex);
    }
  });
};

mapbox.addPolyline = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      var points = arg.points;
      if (points === undefined) {
        reject("Please set the 'points' parameter");
        return;
      }

      var polylineOptions = new com.mapbox.mapboxsdk.annotations.PolylineOptions();
      for (var p in points) {
        var point = points[p];
        polylineOptions.add(new com.mapbox.mapboxsdk.geometry.LatLng(point.lat, point.lng));
      }
      mapView.addPolyline(polylineOptions);
      resolve();
    } catch (ex) {
      console.log("Error in mapbox.addPolyline: " + ex);
      reject(ex);
    }
  });
};

module.exports = mapbox;