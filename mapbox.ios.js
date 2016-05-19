// TODO add callback handler for clicked marker callouts
var mapbox = require("./mapbox-common");

mapbox._getMapStyle = function(input) {
  if (input === mapbox.MapStyle.LIGHT) {
    return MGLStyle.lightStyleURL();
  } else if (input === mapbox.MapStyle.DARK) {
    return MGLStyle.darkStyleURL();
  } else if (input === mapbox.MapStyle.EMERALD) {
    return MGLStyle.emeraldStyleURL();
  } else if (input === mapbox.MapStyle.SATELLITE) {
    return MGLStyle.satelliteStyleURL();
  } else if (input === mapbox.MapStyle.HYBRID) {
    return MGLStyle.hybridStyleURL();
  } else {
    // default
    return MGLStyle.streetsStyleURL();
  }
};

mapbox.show = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      var settings = mapbox.merge(arg, mapbox.defaults);

      // if no accessToken was set the app may crash
      if (settings.accessToken === undefined) {
        reject("Please set the 'accessToken' parameter");
        return;
      }

      var view = UIApplication.sharedApplication().keyWindow.rootViewController.view,
          frameRect = view.frame,
          mapFrame = CGRectMake(
              settings.margins.left,
              settings.margins.top,
              frameRect.size.width - settings.margins.left - settings.margins.right,
              frameRect.size.height - settings.margins.top - settings.margins.bottom
          ),
          styleURL = mapbox._getMapStyle(settings.style);

      MGLAccountManager.setAccessToken(settings.accessToken);
      mapView = MGLMapView.alloc().initWithFrameStyleURL(mapFrame, styleURL);

      // TODO not sure this works as planned.. perhaps better to listen for rotate events ([..didrotate..] and fix the frame
      mapView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;

      if (settings.center) {
        var centerCoordinate = CLLocationCoordinate2DMake(settings.center.lat, settings.center.lng);
        mapView.setCenterCoordinateZoomLevelAnimated(centerCoordinate, settings.zoomLevel, false);
      } else {
        mapView.setZoomLevelAnimated(settings.zoomLevel, false);
      }

      mapView.showsUserLocation = settings.showUserLocation;
      mapView.attributionButton.hidden = settings.hideAttribution;
      mapView.logoView.hidden = settings.hideLogo;
      mapView.compassView.hidden = settings.hideCompass;
      mapView.rotateEnabled = !settings.disableRotation;
      mapView.scrollEnabled = !settings.disableScroll;
      mapView.zoomEnabled = !settings.disableZoom;
      mapView.allowsTilting = !settings.disableTilt;

      if (settings.markers) {
        for (var m in settings.markers) {
          var marker = settings.markers[m];
          var lat = marker.lat;
          var lng = marker.lng;
          var point = MGLPointAnnotation.alloc().init();
          point.coordinate = CLLocationCoordinate2DMake(lat, lng);
          point.title = marker.title;
          point.subtitle = marker.subtitle;
          mapView.addAnnotation(point);
        }
      }

      // Assign first to local variable, otherwise it will be garbage collected since delegate is weak reference.
      var delegate = MGLMapViewDelegateImpl.new().initWithCallback(function (loaded) {
        //delegate = undefined;
      });
      mapView.delegate = delegate;

      // wrapping in a little timeout since the map area tends to flash black a bit initially
      setTimeout(function() {
        view.addSubview(mapView);
      }, 500);

      resolve("Done");
    } catch (ex) {
      console.log("Error in mapbox.show: " + ex);
      reject(ex);
    }
  });
};

mapbox.hide = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      mapView.removeFromSuperview();
      resolve("Done");
    } catch (ex) {
      console.log("Error in mapbox.hide: " + ex);
      reject(ex);
    }
  });
};

mapbox.addMarkers = function (markers) {
  return new Promise(function (resolve, reject) {
    try {
      for (var m in markers) {
        var marker = markers[m];
        var lat = marker.lat;
        var lng = marker.lng;
        var point = MGLPointAnnotation.alloc().init();
        point.coordinate = CLLocationCoordinate2DMake(lat, lng);
        point.title = marker.title;
        point.subtitle = marker.subtitle;
        mapView.addAnnotation(point);
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
      var coordinate = CLLocationCoordinate2DMake(lat, lng);
      mapView.setCenterCoordinateAnimated(coordinate, animated);
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
      var coordinate = mapView.centerCoordinate;
      resolve({
        lat: coordinate.latitude,
        lng: coordinate.longitude
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
        mapView.setZoomLevelAnimated(level, animated);
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
      var level = mapView.zoomLevel;
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
      // TODO implement when the native SDK adds support (it's not in 3.0.1)
      reject("not implemented for iOS (yet)");
    } catch (ex) {
      console.log("Error in mapbox.setTilt: " + ex);
      reject(ex);
    }
  });
};

mapbox.getTilt = function () {
  return new Promise(function (resolve, reject) {
    try {
      // TODO implement when the native SDK adds support (it's not in 3.0.1)
      reject("not implemented for iOS (yet)");
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

      var cam = MGLMapCamera.camera();
      
      cam.centerCoordinate = CLLocationCoordinate2DMake(target.lat, target.lng);

      if (arg.altitude) {
        cam.altitude = arg.altitude;
      }

      if (arg.bearing) {
        cam.heading = arg.bearing;
      }

      if (arg.tilt) {
        cam.pitch = arg.tilt;
      }

      var duration = arg.duration || 15; // default

      mapView.setCameraWithDurationAnimationTimingFunction(
        cam,
        duration,
        CAMediaTimingFunction.functionWithName(kCAMediaTimingFunctionEaseInEaseOut));

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

      /*
      TODO 'sizeof' is not valid in {N}, but we need it for this:
      var coordinates = malloc(points.length * sizeof(CLLocationCoordinate2D));
      for (var i=0; i<points.length; i++) {
        var point = points[i];
        coordinates[i] = CLLocationCoordinate2DMake(point.lat, point.lng);
      }

      var polygon = MGLPolygon.polygonWithCoordinatesCount(
        coordinates,
        points.length);

      mapView.addAnnotation(polygon);
      */

      reject("not implemented for iOS (yet)");
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

      /*
      TODO 
      */

      reject("not implemented for iOS (yet)");
    } catch (ex) {
      console.log("Error in mapbox.addPolyline: " + ex);
      reject(ex);
    }
  });
};

var MGLMapViewDelegateImpl = (function (_super) {
  __extends(MGLMapViewDelegateImpl, _super);
  function MGLMapViewDelegateImpl() {
    _super.apply(this, arguments);
  }

  MGLMapViewDelegateImpl.new = function () {
    return _super.new.call(this);
  };
  MGLMapViewDelegateImpl.prototype.initWithCallback = function (callback) {
    this._callback = callback;
    return this;
  };
  MGLMapViewDelegateImpl.prototype.mapViewDidFinishLoadingMap = function(mapView) {
    this._callback(true);
  };
  MGLMapViewDelegateImpl.prototype.mapViewAnnotationCanShowCallout = function(mapView, annotation) {
    return true;
  };
  MGLMapViewDelegateImpl.prototype.mapViewDidSelectAnnotation = function(mapView, annotation) {
    var title = annotation.title;
    var subtitle = annotation.subtitle;
    var coord = annotation.coordinate;
    console.log("Mapbox marker selected with title: " + title);
    // this won't work as we can only resolve once, so find a different way if somebody needs this..
    // .. perhaps some JS event
    //this._callback(true);
  };
  MGLMapViewDelegateImpl.ObjCProtocols = [MGLMapViewDelegate];
  return MGLMapViewDelegateImpl;
})(NSObject);

module.exports = mapbox;