// template from https://code.earthengine.google.com/058d1aa223ad57adb912fca7cd224d9b

// The namespace for our application. All the state is kept in here.
var app = {};

/** Creates the UI panels. */
app.createPanels = function() {
  
  app.taskPanel = ui.Panel({
    style: {
      position: 'top-left',
      padding: '8px'
    }
  });

  // Create error alert panel
  app.errorPanel = ui.Panel({
    style: {
      position: 'top-center',
      padding: '6px',
      margin: '6px',
      width: '270px',
      backgroundColor: '#ffebee',  // Light red background
      border: '1px solid #ef5350', // Red border
      shown: false
    }
  });

  app.drawRoiButton = {
    button: ui.Button({
      label: app.REC_SYMBOL + ' Rectangle',
      onClick: function() {
        try {
          app.drawRoi();
        } catch (e) {
          app.showError('Failed to initialize drawing tool: ' + e.message);
        }
      }
    }),
  };
  app.zoomToRoi = {
    button: ui.Button({
      label: 'Zoom to ROI',
      onClick: function() {
        try {
          app.setGeom();
          Map.centerObject(app.GEOMETRY);
        } catch (e) {
          app.showError('Please draw a region of interest first.');
        }
      }
    }),
  };
  app.roiPanel = ui.Panel({
    widgets: [
      app.drawRoiButton.button,
      app.zoomToRoi.button,
    ],
    layout: ui.Panel.Layout.flow('horizontal'),
    style: app.SECTION_STYLE
  });
  
  app.fromDate = {
    textbox: ui.Textbox({
      value: '2018-06-01',
      onChange: function(text) {
        var formattedDate = app.isValidDate(text);
        if (formattedDate) {
          app.fromDate.textbox.setValue(formattedDate);
        }
      },
      style: app.TEXTBOX_STYLE,
    }),
  };
  app.toDate = {
    textbox: ui.Textbox({
      value: '2018-07-31',
      onChange: function(text) {
        var formattedDate = app.isValidDate(text);
        if (formattedDate) {
          app.fromDate.textbox.setValue(formattedDate);
        }
      },
      style: app.TEXTBOX_STYLE,
    }),
  };
  app.datePanel = ui.Panel({
    widgets: [
      app.fromDate.textbox,
      ui.Label('to', app.HYPHEN_TEXT_STYLE),
      app.toDate.textbox,
    ],
    layout: ui.Panel.Layout.flow('horizontal'),
    style: app.SECTION_STYLE
  });
  
  app.generateS2Images = {
    button: ui.Button({
      label: 'Generate Sentinel-2 data',
      onClick: function(text) {
        try {
          if (!app.GEOMETRY || app.GEOMETRY.coordinates().getInfo() === null) {
            throw new Error('Please draw a region of interest first.');
          }
          app.setGeom();
          app.refreshS2Layer();
        } catch (e) {
          app.showError(e.message);
        }
      }
    }),
  };
  app.generateS2Images.panel = ui.Panel({
    widgets: [
      app.generateS2Images.button,
    ],
    style: app.SECTION_STYLE
  });
  app.s2Vis = {
    label: ui.Label(),
    select: ui.Select({
      items: Object.keys(app.SENTINEL2_VIS_OPTIONS),
      value: 'Natural color (B4/B3/B2)',
      onChange: function() {
        try {
          app.refreshS2Layer();
        } catch (e) {
          app.showError('Failed to update visualization: ' + e.message);
        }
      },
    }),
  };
  app.s2Vis.panel = ui.Panel({
    widgets: [
      ui.Label('Sentinel-2 MSI visualization', app.HELPER_TEXT_STYLE),
      app.s2Vis.select,
    ],
    style: app.SECTION_STYLE
  });
  
  app.generateL8Images = {
    button: ui.Button({
      label: 'Generate Landsat-8 data',
      onClick: function(text) {
        try {
          if (!app.GEOMETRY || app.GEOMETRY.coordinates().getInfo() === null) {
            throw new Error('Please draw a region of interest first.');
          }
          app.setGeom();
          app.refreshL8Layer();
        } catch (e) {
          app.showError(e.message);
        }
      }
    }),
  };
  app.generateL8Images.panel = ui.Panel({
    widgets: [
      app.generateL8Images.button,
    ],
    style: app.SECTION_STYLE
  });
  app.l8Vis = {
    label: ui.Label(),
    select: ui.Select({
      items: Object.keys(app.L8_VIS_OPTIONS),
      value: 'Natural color (B4/B3/B2)',
      onChange: function() {
        try {
          app.refreshL8Layer();
        } catch (e) {
          app.showError('Failed to update visualization: ' + e.message);
        }
      },
    }),
  };
  app.l8Vis.panel = ui.Panel({
    widgets: [
      ui.Label('Landsat-8 visualization', app.HELPER_TEXT_STYLE),
      app.l8Vis.select,
    ],
    style: app.SECTION_STYLE
  });

  app.s2ndvi = {
    slider: ui.Slider({
      min: -1,
      max: 1,
      step: 0.01,
      value: 0,
      style: {stretch: 'horizontal', width: '200px'},
      onChange: function(value) {
        try {
          if (!app.GEOMETRY || app.GEOMETRY.coordinates().getInfo() === null) {
            throw new Error('Please draw a region of interest first.');
          }
          app.setGeom();
          app.refreshS2ThresholdLayer(value);
        } catch (e) {
          app.showError(e.message);
        }
      },
    })
  };
  app.s2ndvi.panel = ui.Panel({
    widgets: [
      app.s2ndvi.slider
    ],
    layout: ui.Panel.Layout.flow('horizontal'),
    style: app.SECTION_STYLE
  });
  app.l8ndvi = {
    slider: ui.Slider({
      min: -1,
      max: 1,
      step: 0.01,
      value: 0,
      style: {stretch: 'horizontal', width: '200px'},
      onChange: function(value) {
        try {
          if (!app.GEOMETRY || app.GEOMETRY.coordinates().getInfo() === null) {
            throw new Error('Please draw a region of interest first.');
          }
          app.setGeom();
          app.refreshL8ThresholdLayer(value);
        } catch (e) {
          app.showError(e.message);
        }
      },
    })
  };
  app.l8ndvi.panel = ui.Panel({
    widgets: [
      app.l8ndvi.slider
    ],
    layout: ui.Panel.Layout.flow('horizontal'),
    style: app.SECTION_STYLE
  });
}

/** Creates the app helper functions. */
app.createHelpers = function() {
  
  app.showError = function(message) {
    app.errorPanel.clear();
    app.errorPanel.add(ui.Label({
      value: '⚠️ ' + message,
      style: {color: '#d32f2f', fontSize: '14px'}
    }));
    app.errorPanel.style().set('shown', true);
    
    // Hide error after 5 seconds
    ui.util.setTimeout(function() {
      app.errorPanel.style().set('shown', false);
    }, 5000);
  };
  
  app.isValidDate = function(dateString) {
    // First try to parse the date
    try {
      // Handle single digit months/days by attempting to parse
      var parts = dateString.split('-');
      if (parts.length !== 3) {
        app.showError('Date must be in YYYY-MM-DD format');
        return false;
      }
      
      var year = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10);
      var day = parseInt(parts[2], 10);
      
      // Check if any part failed to parse
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        app.showError('Date must contain valid numbers');
        return false;
      }
      
      // Validate ranges
      if (year < 2015 || year > 2025) {
        app.showError('Year must be between 2015 and 2025');
        return false;
      }
      if (month < 1 || month > 12) {
        app.showError('Month must be between 1 and 12');
        return false;
      }
      if (day < 1 || day > 31) {
        app.showError('Day must be between 1 and 31');
        return false;
      }
      
      // Format the date with leading zeros
      var formattedDate = year + '-' + 
        (month < 10 ? '0' + month : month) + '-' + 
        (day < 10 ? '0' + day : day);
      
      return formattedDate;  // Return the properly formatted date
    } catch (e) {
      app.showError('Invalid date format. Please use YYYY-MM-DD');
      return false;
    }
  };

  app.drawRoi = function() {
    try {
      app.DRAWING_TOOLS.layers().reset();
      app.DUMMY_GEOMETRY = ui.Map.GeometryLayer({
        geometries: null,
        name: 'roi',
        color: 'red'
      });
      app.DRAWING_TOOLS.layers().add(app.DUMMY_GEOMETRY);
      app.DRAWING_TOOLS.setShape('rectangle');
      app.DRAWING_TOOLS.draw();
    } catch (e) {
      app.showError('Failed to initialize drawing tool: ' + e.message);
    }
  };
  app.updateRoi = function() {
    try {
      var geomLayer = app.DRAWING_TOOLS.layers().get(0);
      if (!geomLayer) {
        throw new Error('No geometry layer found');
      }

      var aoi = geomLayer.getEeObject();
      var aoiFc = ee.FeatureCollection(aoi);
      var empty = ee.Image().byte();
      var outline = empty.paint({
        featureCollection: aoiFc,
        color: 1,
        width: 3
      });
      
      var outlineLayer = ui.Map.Layer(outline, {palette: 'red'}, 'ROI');
      Map.layers().set(0, outlineLayer);
    
      // Set the drawing mode back to null; turns drawing off.
      app.DRAWING_TOOLS.setShape(null);
      app.DUMMY_GEOMETRY.setShown(false);
      
      var geom = geomLayer.toGeometry();
      app.GEOMETRY = geom;
      
    } catch (e) {
      app.showError('Failed to update region of interest: ' + e.message);
    }
  };

  app.getUtmCRS = function(lng, lat) {
    try {
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        throw new Error('Invalid coordinates');
      }
      var zoneNumber = (Math.floor((lng + 180) / 6) % 60) + 1;
      var hemNumber = lat < 0 ? 7 : 6;
      return 'EPSG:32' + hemNumber + zoneNumber;
    } catch (e) {
      app.showError('Failed to determine UTM zone: ' + e.message);
      return 'EPSG:4326'; // fallback to WGS84
    }
  };

  app.setLoadingMode = function(enabled) {
    try {
      var loadDependentWidgets = [
        app.sentinel2.select,
      ];
      loadDependentWidgets.forEach(function(widget) {
        widget.setDisabled(enabled);
      });
    } catch (e) {
      app.showError('Failed to set loading mode: ' + e.message);
    }
  };
  
  app.removeLayer = function(layerName) {
    var layers = Map.layers();
    layers.forEach(function(existingLayer) {
      if (existingLayer.getName() === layerName) {
        Map.layers().remove(existingLayer);  // Remove the existing layer with the same name
      }
    });
  }
  
  app.setGeom = function() {
    try {
      if (!app.DRAWING_TOOLS.layers().length()) {
        throw new Error('No geometry layer available');
      }
      app.GEOMETRY = app.DRAWING_TOOLS.layers().get(0).toGeometry();
      if (!app.GEOMETRY) {
        throw new Error('Please draw a region of interest first');
      }
    } catch (e) {
      app.showError(e.message);
    }
  };
  
  app.generateS2Data = function() {
    try {
      app.s2Img = null;
      var geom = app.GEOMETRY;
      if (!geom) {
        throw new Error('Please draw a region of interest first');
      }

      var fromDate = app.fromDate.textbox.getValue();
      var toDate = app.toDate.textbox.getValue();
      
      if (!app.isValidDate(fromDate) || !app.isValidDate(toDate)) {
        throw new Error('Please enter valid dates in YYYY-MM-DD format');
      }

      fromDate = ee.Date(fromDate);
      toDate = ee.Date(toDate);
      
      var MAX_CLOUD_PROBABILITY = 80;
      
      var s2 = ee.ImageCollection('COPERNICUS/S2');
      var s2clouds = ee.ImageCollection('COPERNICUS/S2_CLOUD_PROBABILITY');
      
      // Filter input collections by desired data range and region.
      var criteria = ee.Filter.and(
          ee.Filter.bounds(geom), ee.Filter.date(fromDate, toDate));
      s2 = s2.filter(criteria);
      s2clouds = s2clouds.filter(criteria);
      
      if (s2.size().getInfo() === 0) {
        throw new Error('No Sentinel images found for the specified region and date range');
      }
      
      // Join S2 TOA with cloud probability dataset to add cloud mask.
      s2 = ee.Join.saveFirst('cloudProbability').apply({
        primary: s2,
        secondary: s2clouds,
        condition: ee.Filter.equals({
          leftField: 'system:index',
          rightField: 'system:index'
        })
      });
      
      var maskClouds = function(img) {
        var noClouds = ee.Image(img.get('cloudProbability')).lt(MAX_CLOUD_PROBABILITY);
        return ee.Image(img).updateMask(noClouds);
      };
      
      var s2noClouds = s2.map(maskClouds);
      var s2Composite = ee.ImageCollection(s2noClouds)
        .select(app.SPECTRAL_BANDS)    
        .median()
        .divide(10000)
        .clamp(0, 1)
        .unmask()
        .float();
      
      app.s2Img = s2Composite;
      
    } catch (e) {
      app.showError('Failed to generate Sentinel-2 data: ' + e.message);
      return null;
    }
  };
  app.refreshS2Layer = function() {
    try {
      var geom = app.GEOMETRY;
      if (!geom) {
        throw new Error('Please draw a region of interest first');
      }

      app.generateS2Data();
      if (!app.s2Img) {
        throw new Error('Failed to generate Sentinel-2 data');
      }

      var s2VisOption = app.SENTINEL2_VIS_OPTIONS[app.s2Vis.select.getValue()];
      var s2Layer = ui.Map.Layer(app.s2Img.clip(geom), s2VisOption.visParams, 'Sentinel-2 MSI composite');
      app.removeLayer('Sentinel-2 MSI composite');
      Map.add(s2Layer);
    } catch (e) {
      app.showError(e.message);
    }
  };
  app.generateS2NDVI = function() {
    try {
      if (!app.s2Img) {
        throw new Error('Failed to generate Sentinel-2 data');
      }

      var ndwi = app.s2Img.normalizedDifference(['B3', 'B8']).rename('NDWI');
      var waterMask = ndwi.lt(0);  // NDWI < 0 indicates non-water
      var ndvi = app.s2Img.normalizedDifference(['B8', 'B4']).rename('NDVI');
      return ndvi.updateMask(waterMask).unmask(0).clip(app.GEOMETRY);
    } catch (e) {
      app.showError('Failed to generate Sentinel-2 based NDVI: ' + e.message);
      return null;
    }
  };
  app.refreshS2ThresholdLayer = function(thresh) {
    try {
      var geom = app.GEOMETRY;
      if (!geom) {
        throw new Error('Please draw a region of interest first');
      }

      var s2ndvi = app.generateS2NDVI();
      if (!s2ndvi) {
        throw new Error('Failed to generate NDVI data');
      }

      var threshVisOption = app.THRESH_VIS_OPTIONS;
      var threshLayer = ui.Map.Layer(s2ndvi.gt(thresh).clip(geom), threshVisOption.visParams, 'Sentinel-Based Threshold');
      app.removeLayer('Sentinel-Based Threshold');
      Map.add(threshLayer);
      app.s2threshLayer = s2ndvi.gt(thresh).clip(geom);
    } catch (e) {
      app.showError(e.message);
    }
  };
  
  app.generateL8Data = function() {
    try {
      app.l8Img = null;
      var geom = app.GEOMETRY;
      if (!geom) {
        throw new Error('Please draw a region of interest first');
      }

      var fromDate = app.fromDate.textbox.getValue();
      var toDate = app.toDate.textbox.getValue();
      
      if (!app.isValidDate(fromDate) || !app.isValidDate(toDate)) {
        throw new Error('Please enter valid dates in YYYY-MM-DD format');
      }

      fromDate = ee.Date(fromDate);
      toDate = ee.Date(toDate);
      
      var col = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2');
      
      // Filter input collections by desired data range and region.
      var criteria = ee.Filter.and(
          ee.Filter.bounds(geom), ee.Filter.date(fromDate, toDate));
      col = col.filter(criteria);

      if (col.size().getInfo() === 0) {
        throw new Error('No Landsat images found for the specified region and date range');
      }

      var scaling = function(image) {
        var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
        var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
        return image.addBands(opticalBands, null, true).addBands(thermalBands, null, true);
      }
      var l8 = col.map(scaling);

      var maskClouds = function(image) {
        // Bit 3 is cloud shadow, Bit 5 is cloud
        var cloudShadowBitMask = 1 << 3; // 1000 in binary (8 in decimal)
        var cloudsBitMask = 1 << 5;      // 100000 in binary (32 in decimal)
        
        // Get the QA band
        var qa = image.select('QA_PIXEL');
        
        // Create a mask for clear conditions (both cloud and cloud shadow bits are 0)
        var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
                     .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
        
        // Apply the mask to the image
        return image.updateMask(mask);
      }

      var l8noClouds = l8.map(maskClouds);
      var l8Composite = ee.ImageCollection(l8noClouds)
        .select(app.L8_SPECTRAL_BANDS)    
        .median()
        .clamp(0, 1)
        .unmask()
        .float();

      app.l8Img = l8Composite;
      
    } catch (e) {
      app.showError('Failed to generate Landsat-8 data: ' + e.message);
      return null;
    }
  };
  app.refreshL8Layer = function() {
    try {
      var geom = app.GEOMETRY;
      if (!geom) {
        throw new Error('Please draw a region of interest first');
      }

      app.generateL8Data();
      if (!app.l8Img) {
        throw new Error('Failed to generate Landsat-8 data.');
      }

      var l8VisOption = app.L8_VIS_OPTIONS[app.l8Vis.select.getValue()];
      var l8Layer = ui.Map.Layer(app.l8Img.clip(geom), l8VisOption.visParams, 'Landsat-8 composite');
      app.removeLayer('Landsat-8 composite');
      Map.add(l8Layer);
    } catch (e) {
      app.showError(e.message);
    }
  };
  app.generateL8NDVI = function() {
    try {
      if (!app.l8Img) {
        throw new Error('Failed to generate Landsat-8 data.');
      }

      var ndwi = app.l8Img.normalizedDifference(['SR_B3', 'SR_B5']).rename('NDWI');
      var waterMask = ndwi.lt(0);  // NDWI < 0 indicates non-water
      var ndvi = app.l8Img.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
      return ndvi.updateMask(waterMask).unmask(0).clip(app.GEOMETRY);
    } catch (e) {
      app.showError('Failed to generate Landsat-Based NDVI: ' + e.message);
      return null;
    }
  };
  app.refreshL8ThresholdLayer = function(thresh) {
    try {
      var geom = app.GEOMETRY;
      if (!geom) {
        throw new Error('Please draw a region of interest first');
      }

      var l8ndvi = app.generateL8NDVI();
      if (!l8ndvi) {
        throw new Error('Failed to generate Landsat-Based NDVI data.');
      }

      var threshVisOption = app.L8_THRESH_VIS_OPTIONS;
      var threshLayer = ui.Map.Layer(l8ndvi.gt(thresh).clip(geom), threshVisOption.visParams, 'Landsat-Based Threshold');
      app.removeLayer('Landsat-Based Threshold');
      Map.add(threshLayer);
      app.l8threshLayer = l8ndvi.gt(thresh).clip(geom);
    } catch (e) {
      app.showError(e.message);
    }
  };
}

/** Creates the app constants. */
app.createConstants = function() {
  app.SPECTRAL_BANDS = ['B2', 'B3', 'B4', 'B8'];
  app.L8_SPECTRAL_BANDS = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5'];
  app.TILING = false;
  app.SECTION_STYLE = {margin: '5px 0 0 0'};
  app.HELPER_TEXT_STYLE = {
    margin: '8px 0px -3px 8px',
    fontSize: '12px',
    color: 'gray'
  };
  app.HYPHEN_TEXT_STYLE = {
    margin: '15px 0px 0px 8px',
    fontSize: '12px',
    color: 'gray'
  };
  app.TEXTBOX_STYLE = {
    width: '100px',
    padding: '1px',
    textAlign: 'center',
    position: 'top-center',
  };  
  app.SENTINEL2_VIS_OPTIONS = {
    'False color (B8/B4/B3)': {
      description: 'Urban areas are cyan blue, vegetation is shades of red, ' +
      'and soils are browns.',
      visParams: {gamma: 1.3, min: 0, max: 0.3, bands: ['B8', 'B4', 'B3']}
    },
    'Natural color (B4/B3/B2)': {
      description: 'Ground features appear in colors similar to their ' +
                   'appearance to the human visual system.',
      visParams: {gamma: 1.3, min: 0, max: 0.3, bands: ['B4', 'B3', 'B2']}
    },
  };
  app.THRESH_VIS_OPTIONS = {
    visParams: {min: 0, max: 1, palette: ['white', 'green'], opacity: 0.6}
  };
  app.L8_VIS_OPTIONS = {
    'False color (B5/B4/B3)': {
      description: 'Urban areas are cyan blue, vegetation is shades of red, ' +
      'and soils are browns.',
      visParams: {gamma: 1.3, min: 0, max: 0.3, bands: ['SR_B5', 'SR_B4', 'SR_B3']}
    },
    'Natural color (B4/B3/B2)': {
      description: 'Ground features appear in colors similar to their ' +
                   'appearance to the human visual system.',
      visParams: {gamma: 1.3, min: 0, max: 0.3, bands: ['SR_B4', 'SR_B3', 'SR_B2']}
    },
  };
  app.L8_THRESH_VIS_OPTIONS = {
    visParams: {min: 0, max: 1, palette: ['white', 'cyan'], opacity: 0.6}
  };

  app.GEOMETRY = ee.Geometry.BBox(0, 0, 0, 0);
  app.DRAWING_TOOLS = Map.drawingTools();
  app.REC_SYMBOL = '⬛' ;
};

app.panel = function(){
  var panel = ui.Panel({
    widgets: [
      ui.Label('Follow the steps below to generate NDVI-threshold based mapping of urban green spaces.', {fontWeight: 'bold'}),
      app.errorPanel,  // Add error panel at the top
      ui.Label('1. Draw a region of interest.', {fontWeight: 'bold'}),
      app.roiPanel,
      ui.Label('2. Select a time period for the satellite images.', {fontWeight: 'bold'}),
      ui.Label('Date range', app.HELPER_TEXT_STYLE),
      app.datePanel,
      ui.Label('3. Generate satellite data. You can also change the visualization of the images.', {fontWeight: 'bold'}),
      app.s2Vis.panel,
      app.generateS2Images.button,
      app.l8Vis.panel,
      app.generateL8Images.button,
      ui.Label('4. Generate the urban green layer based on NDVI threshold.', {fontWeight: 'bold'}),
      ui.Label('Sentinel-2 based NDVI Threshold', app.HELPER_TEXT_STYLE),
      app.s2ndvi.panel,
      ui.Label('Landsat-8 based NDVI Threshold', app.HELPER_TEXT_STYLE),
      app.l8ndvi.panel,
      // ui.Label('5. Generate URLs to download data.', {fontWeight: 'bold'}),
      // app.export.panel,
      // ui.Label('Task URLs', {fontWeight: 'bold', shown: false}),
      // app.download.panel,
    ],
    style: {width: '320px', padding: '8px', shown: true}
  });
  ui.root.insert(0, panel);
}


/** Creates the application interface. */
app.boot = function() {
  try {
    Map.setOptions('HYBRID');
    app.createHelpers();
    app.createPanels();
    app.createConstants();
    app.panel();

    var defaultGeom = ee.Geometry.Point([10, 20]);
    Map.centerObject(defaultGeom, 3);
    app.DRAWING_TOOLS.layers().reset();
    app.DRAWING_TOOLS.setShown(false);
    app.DRAWING_TOOLS.onDraw(ui.util.debounce(app.updateRoi, 500));
    app.DRAWING_TOOLS.onEdit(ui.util.debounce(app.updateRoi, 500));

  } catch (e) {
    // Show error in the UI
    app.showError('Failed to initialize application: ' + e.message);
  }
};

app.boot();