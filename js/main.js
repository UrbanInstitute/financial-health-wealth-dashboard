// variables to catch "initial" state
var selectedPuma = "Montgomery County (South)--Bethesda, Potomac & North Bethesda",
    selectedPumaId = 2401004,
    clickedGeoID = null,
    selectedCity = "Chicago, IL",
    selectedState = "Maryland",
    selectedMetric = "median net worth",
    pumaSpecificUrl = false;

var screenWidth = window.innerWidth || document.documentElement.clientWidth;

var COMMAFORMAT = d3.format(",.1f");
var PCTFORMAT = d3.format(".0%");
var PCTFORMAT_TWODECIMAL = d3.format(".2%");
var DOLLARFORMAT = d3.format("$,.0f");
var DOLLARFORMAT_SHORT = function(d) { return "$" + d3.format(".2s")(d); };

var tabNames = ["dailyFinances", "economicResilience", "upwardMobility"];

var metrics = {
  "has_delinq_pct": {
    "label": "Residents with delinquent debt",
    "legendBreaks": [0.06, 0.2, 0.27, 0.36, 0.46, 0.66],
    "labelFormat": PCTFORMAT,
    "legendLabelFormat": PCTFORMAT
  },
  "share_of_student_loan_holders_with_delinquent_student_loans":  {
    "label": "Student loan holders with delinquent student loan debt",
    "legendBreaks": [0, 0.06, 0.09, 0.12, 0.16, 0.25],
    "labelFormat": PCTFORMAT,
    "legendLabelFormat": PCTFORMAT
  },
  "share_of_low_income_households_with_housing_cost_burden": {
    "label": "Low-income households with housing-cost burden",
    "legendBreaks": [0.24, 0.46, 0.57, 0.68, 0.78, 0.96],
    "labelFormat": PCTFORMAT,
    "legendLabelFormat": PCTFORMAT
  },
  "at least 2000 emergency savings":  {
    "label": "Households with at least $2,000 in emergency savings (estimated)",
    "legendBreaks": [0.27, 0.5, 0.6, 0.7, 0.77, 0.93],
    "labelFormat": PCTFORMAT,
    "legendLabelFormat": PCTFORMAT
  },
  "score_cleanpos_p50": {
    "label": "Median credit score",
    "legendBreaks": [569, 647, 683, 711, 738, 782],
    "labelFormat": null,
    "legendLabelFormat": null
  },
  "had_foreclosure_2yr_pct": {
    "label": "Mortgage holders who had a foreclosure in the past two years",
    "legendBreaks": [0, 0.0005, 0.001, 0.002, 0.004, 0.008],
    "labelFormat": PCTFORMAT_TWODECIMAL,
    "legendLabelFormat": PCTFORMAT_TWODECIMAL
  },
  "share_of_people_with_health_insurance": {
    "label": "Residents with health insurance coverage",
    "legendBreaks": [0.57, 0.76, 0.85, 0.9, 0.94, 0.99],
    "labelFormat": PCTFORMAT,
    "legendLabelFormat": PCTFORMAT
  },
  "median net worth": {
    "label": "Median net worth (estimated)",
    "legendBreaks": [767, 123004, 250928, 437751, 723204, 1495702],
    "labelFormat": DOLLARFORMAT,
    "legendLabelFormat": DOLLARFORMAT_SHORT
  },
  "homeownership_rate": {
    "label": "Homeownership rate",
    "legendBreaks": [0.04, 0.33, 0.5, 0.6, 0.75, 0.94],
    "labelFormat": PCTFORMAT,
    "legendLabelFormat": PCTFORMAT
  },
  "median_home_value_among_homeowners": {
    "label": "Median home value among homeowners",
    "legendBreaks": [40000, 220000, 400000, 660000, 1100000, 2200000],
    "labelFormat": DOLLARFORMAT,
    "legendLabelFormat": DOLLARFORMAT_SHORT
  }
};


if(screenWidth > 572) {
  document.getElementById("map").style.height = '576px';
} else {
  document.getElementById("map").style.height = '350px';
}

var dispatch = d3.dispatch("load", "viewChange", "geoSearched", "pumaSelected", "mapMouseover", "mapMouseout", "metricChange", "resize", "clearSelection");

// POLYFILL FOR IE which doesn't support .forEach() on node lists
if (typeof Array.prototype.forEach != 'function') {
  Array.prototype.forEach = function (callback) {
    for (var i = 0; i < this.length; i++) {
      callback.apply(this, [this[i], i, this]);
    }
  };
}

if (window.NodeList && !NodeList.prototype.forEach) {
  NodeList.prototype.forEach = Array.prototype.forEach;
}

d3.queue()
  .defer(d3.csv, "data/racial_comp_data.csv")
  .defer(d3.csv, "data/metrics_all.csv")
  .defer(d3.csv, "data/city_state_us_racial_metrics.csv")
  .defer(d3.csv, "data/search_data.csv")
  .defer(d3.csv, "data/puma_city_state_mapping.csv")
  .defer(d3.csv, "data/pumas_zipcode.csv")
  .defer(d3.json, "data/pumas_bboxes.json")
  .defer(d3.json, "data/cities_bboxes.json")
  .await(function(error, racial_comp_data, metrics_all, city_state_us_racial_metrics, search_data, puma_city_state_mapping, pumas_zipcode, pumas_bboxes, cities_bboxes) {

    if(error) throw error;

    racial_comp_data.forEach(function(d) {
      d.share = +d.share,
      d.geo_id = +d.geo_id
    });

    metrics_all.forEach(function(d) {
      d.value = +d.value
    });

    city_state_us_racial_metrics.forEach(function(d) {
      d.value = +d.value
    });

    pumas_zipcode.forEach(function(d) {
      // d.puma_id = +d.puma_id,
      d.zipcode = +d.zipcode
    });

    // determine if there is query parameter with a PUMA already selected
    // if so, update selectedPUMA, selectedState, selectedCity
    if(window.location.search !== "") {
      var params = parseQueryString(window.location.search);
      pumaSpecificUrl = true;

      selectedPumaId = params.puma_id;
      clickedGeoID = selectedPumaId;
      selectedPuma = puma_city_state_mapping.filter(function(d) { return d.puma_id === selectedPumaId; })[0].puma_name;
      selectedState = puma_city_state_mapping.filter(function(d) { return d.puma_id === selectedPumaId; })[0].state_name;
      var city = puma_city_state_mapping.filter(function(d) { return d.puma_id === selectedPumaId; })[0].city;
      selectedCity = city !== "NA" ? city : selectedCity;
      d3.select(".dashboard").classed("inactive", false);
    }

    dispatch.call("load", this, racial_comp_data, metrics_all, city_state_us_racial_metrics, search_data, puma_city_state_mapping, pumas_zipcode, pumas_bboxes, cities_bboxes);

    var zipcodeSearch = false;
    if(pumaSpecificUrl) dispatch.call("pumaSelected", this, +selectedPumaId, selectedPuma, false);
});

dispatch.on("load.searchbox", function(racial_comp_data, metrics_all, city_state_us_racial_metrics, search_data, puma_city_state_mapping, pumas_zipcode, pumas_bboxes, cities_bboxes) {
  // currently, the searchbox only allows search by postcode for PCs, not for regions/countries
  // this decision was made to minimize the amount of data the user needed to download
  // (there are over 2.6 million unique postcodes in the UK)
  $("#locationSearch").autocomplete({
    autoFocus: true,
    source: function( request, response) {

      var matcher = new RegExp( "^" + $.ui.autocomplete.escapeRegex( request.term ), "i" ); 
      response(
        $.grep( search_data, function( value ) {
          value = value.label;
          return matcher.test( value );
        }) );
      },
      select: function( event, ui ) {
        $("#locationSearch").val(ui.item.label);   // need this so when user clicks on a county name instead of hitting the enter key, the full name is captured (otherwise, only typed letters will get captured)
        
        d3.select(".searchbox input").style("background-image", "url(./img/searchClose.svg");

        // remove any query parameters from the URL
        updateQueryString("");
        
        // clear selected PUMA
        selectedPumaId = null;
        clickedGeoID = null;

        // clear any city boundaries on the map
        map.removeFeatureState({
          source: 'composite',
          sourceLayer: 'citiesid'
        });
    
        dispatch.call("geoSearched", this, ui.item.label, ui.item.id, ui.item.geo_level, ui.item.has_bonus_info, "searchbox");

        if(ui.item.geo_level === "Zipcode") {
          var pumaName = pumas_zipcode.filter(function(d) { return d.zipcode === +ui.item.id; })[0].puma_name;
          var pumaId = pumas_zipcode.filter(function(d) { return d.zipcode === +ui.item.id; })[0].puma_id;
          selectedPuma = pumaName;
          selectedPumaId = pumaId;
          clickedGeoID = pumaId;

          var zipcodeSearch = true;
          dispatch.call("pumaSelected", this, +pumaId, pumaName, zipcodeSearch);

          map.setFeatureState({
            source: 'composite',
            sourceLayer: 'pumasid',
            id: +pumaId
          },
          {
            highlight: true
          });
        }

        if(ui.item.geo_level === "City") {
          d3.select(".dashboard").classed("inactive", true);
        }
      }
    });
});

dispatch.on("load.map", function(racial_comp_data, metrics_all, city_state_us_racial_metrics, search_data, puma_city_state_mapping, pumas_zipcode, pumas_bboxes, cities_bboxes) {

  initMap(puma_city_state_mapping);

  // make legend
  var width = screenWidth > 400 ? 369 : 300,
    height = 40,
    margin = {top: 0, right: 25, bottom: 0, left: 25};

  var legendSvg = d3.select(".map .legend")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  var legend = makeLegend()
    .width(width)
    .height(height)
    .margin(margin)
    .labels(metrics[selectedMetric].legendBreaks)
    .labelFormat(metrics[selectedMetric].legendLabelFormat);

  legendSvg.call(legend);

  dispatch.on("metricChange.map", function(metric) {

    // when the user switches to a new metric, update the map to show that metric
    Object.keys(metrics).forEach(function(m) {
      if(m === metric) {
        map.setLayoutProperty(m, "visibility", "visible");
      }
      else {
        map.setLayoutProperty(m, "visibility", "none");
      }
    })

    // update legend labels
    legend.labels(metrics[metric].legendBreaks)
      .labelFormat(metrics[metric].legendLabelFormat);

    legendSvg.call(legend);

    // update text below dropdown
    var data = metrics_all.filter(function(d) { return d.geo_name === selectedPuma && d.metric === metric; })[0];
    if(isNaN(data.value)) {
      d3.select(".map .metric .metricValue").text("Data not available");
    }
    else {
      d3.select(".map .metric .metricValue").text(metrics[metric].labelFormat ? metrics[metric].labelFormat(data.value) : data.value);
    }
    d3.select(".map .metricName").text(metrics[metric].label);
  });

  dispatch.on("geoSearched.map", function(selected_geo_name, selected_geo_id, selected_geo_level, has_bonus_info, source) {
    d3.select(".mapContainer .instructions").classed("hidden", false);
    d3.select(".buttons").classed("disabled", true);
    
    selected_geo_name = has_bonus_info === "1" ? selected_geo_name.slice(0, -1) : selected_geo_name;
    d3.select(".searchResults .geoName").text(selected_geo_name);

    if(selected_geo_level === "Zipcode") {
      d3.select(".searchResults .geoName").classed("bonusCity", false);
      d3.select(".searchResults .geoName").classed("invisible", false);
      d3.select(".zipCodeLocated").classed("invisible", false);
      d3.select(".numPumasInGeo").classed("invisible", true);
      d3.select(".clearSelection").classed("disabled", false);
    }
    
    if(selected_geo_level === "City") {
      map.setFeatureState({
        source: 'composite',
        sourceLayer: 'citiesid',
        id: selected_geo_id
      },
      {
        highlight: true
      });

      d3.select(".zipCodeLocated").classed("invisible", true);
      var numPumasInGeo = selected_geo_level === "City" && puma_city_state_mapping.filter(function(d) { return d.city === selected_geo_name && d.puma_name !== "NA"; }).length;
      var text = "This city contains " + numPumasInGeo + (numPumasInGeo !== 1 ? " PUMAs" : " PUMA");
      d3.select(".searchResults .numPumasInGeo .text").html(text + (has_bonus_info == 0 ? '.' : ''));
      if(has_bonus_info == 1) {
        d3.select(".searchResults .hasBonusData").classed("hidden", false)
      }
      else {
        d3.select(".searchResults .hasBonusData").classed("hidden", true);
      }
      d3.select(".searchResults .geoName").classed("invisible", false);
      d3.select(".numPumasInGeo").classed("invisible", false);
      d3.select(".clearSelection").classed("disabled", true);
    }
    d3.select(".searchResults").classed("invisible", false);
    d3.select(".searchResults").classed("hidden", false);

    if(has_bonus_info === "1") {
      d3.select(".searchResults .geoName").classed("bonusCity", true);
      d3.select(".openModalBtn").classed("invisible", false);
      d3.select(".spacer").classed("invisible", false);
    }
    else {
      d3.select(".searchResults .geoName").classed("bonusCity", false);
      d3.select(".openModalBtn").classed("invisible", true);
      d3.select(".spacer").classed("invisible", true);
    }

    // if user searched for a zipcode, need to map it to the PUMA it's been assigned to
    // because we're zooming in the user to the PUMA rather than zip code (zip codes have
    // no established boundaries)
    var puma_id = selected_geo_level === "Zipcode" && pumas_zipcode.filter(function(d) { return d.zipcode === +selected_geo_id; })[0].puma_id;
    var bounds = selected_geo_level === "City" ? cities_bboxes[selected_geo_id]["bounds"] : pumas_bboxes[puma_id]["bounds"];
    zoomIn(bounds);

    // hide any information displayed below the metric dropdown
    d3.select(".map .metric .metricValue").classed("hidden", true);
    d3.select(".map .metric .metricValue").text("");
    d3.select(".map .metric .pumaName").classed("hidden", true);
    d3.select(".map .metric .pumaName").text("");
    d3.select(".map .metric .metricName").classed("hidden", true);

    // also remove any PUMA outlines from the map
    map.removeFeatureState({
      source: 'composite',
      sourceLayer: 'pumasid'
    });
  });

  dispatch.on("clearSelection.map", function() {
    clickedGeoID = null;
    d3.select(".mapContainer .instructions").classed("hidden", false);
    d3.select(".buttons").classed("disabled", true);
    d3.select(".clearSelection").classed("disabled", true);
  
    d3.select(".searchResults .geoName").classed("bonusCity", false);
    d3.select(".geoName").classed("invisible", true);
    d3.select(".zipCodeLocated").classed("invisible", true);
    d3.select(".numPumasInGeo").classed("invisible", true);
    
    d3.select(".searchResults").classed("hidden", true);

    d3.select(".openModalBtn").classed("invisible", true);
    d3.select(".spacer").classed("invisible", true);

    // hide any information displayed below the metric dropdown
    d3.select(".map .metric .metricValue").classed("hidden", true);
    d3.select(".map .metric .metricValue").text("");
    d3.select(".map .metric .pumaName").classed("hidden", true);
    d3.select(".map .metric .pumaName").text("");
    d3.select(".map .metric .metricName").classed("hidden", true);

    // also remove any PUMA outlines from the map
    map.removeFeatureState({
      source: 'composite',
      sourceLayer: 'pumasid'
    });
  });

  dispatch.on("pumaSelected.map", function(selected_geo_id, selected_geo_name, zipcodeSearch) {
    d3.select(".searchResults .geoName").text(selected_geo_name);
    d3.select(".searchResults .geoName").classed("invisible", false);
    d3.select(".zipCodeLocated").classed("invisible", !zipcodeSearch);
    d3.select(".searchResults .geoName").classed("bonusCity", false);
    d3.select(".searchResults .numPumasInGeo").classed("invisible", true);
    d3.select(".searchResults").classed("invisible", false);
    d3.select(".searchResults").classed("hidden", false);
    d3.select(".mapContainer .instructions").classed("invisible", true);
    d3.select(".clearSelection").classed("disabled", false);

    // check if PUMA is in a city with bonus info, if so, show the modal button
    var data = puma_city_state_mapping.filter(function(d) { return +d.puma_id === selected_geo_id; })[0];
    if(data.city !== "NA" && data.has_bonus_info === "1") {
      d3.select(".openModalBtn").classed("invisible", false);
      d3.select(".spacer").classed("invisible", false);
    }
    else {
      d3.select(".openModalBtn").classed("invisible", true);
      d3.select(".spacer").classed("invisible", true);
    }

    var bounds = pumas_bboxes[selected_geo_id]["bounds"];
    zoomIn(bounds);

    populateDropdownInfoPanel(selected_geo_id);
  });

  dispatch.on("mapMouseover.map", function(hovered_geo_id) {
    populateDropdownInfoPanel(hovered_geo_id);
  });

  dispatch.on("mapMouseout.map", function(clicked_geo_id) {
    if(clickedGeoID) {
      var data = metrics_all.filter(function(d) { return +d.geo_id === +clickedGeoID && d.metric === selectedMetric; })[0];
      
      if(isNaN(data.value)) {
        d3.select(".map .metric .metricValue").text("Data not available");
      }
      else {
        d3.select(".map .metric .metricValue").text(metrics[selectedMetric].labelFormat ? metrics[selectedMetric].labelFormat(data.value) : data.value);
      }
      d3.select(".map .metric .pumaName").text(data.geo_name);
    }
    else {
      d3.select(".map .metric .metricValue").classed("hidden", true);
      d3.select(".map .metric .pumaName").classed("hidden", true);
      d3.select(".map .metric .metricName").classed("hidden", true);
    }
  });

  dispatch.on("resize.map", function() {
    if(screenWidth > 572) {
      document.getElementById("map").style.height = '576px';
    } else {
      document.getElementById("map").style.height = '350px';
    }
    
    width = screenWidth > 400 ? 369 : 300;

    legendSvg.attr("width", width);
    legend.width(width);
    legendSvg.call(legend);
  })

  function populateDropdownInfoPanel(selected_geo_id) {
    var data = metrics_all.filter(function(d) { return +d.geo_id === selected_geo_id && d.metric === selectedMetric; })[0];
    if(isNaN(data.value)) {
      d3.select(".map .metric .metricValue").text("Data not available");
    }
    else {
      d3.select(".map .metric .metricValue").text(metrics[selectedMetric].labelFormat ? metrics[selectedMetric].labelFormat(data.value) : data.value);
    }    
    
    d3.select(".map .metric .pumaName").text(data.geo_name);
    d3.select(".map .metric .metricName").text(metrics[selectedMetric].label);

    d3.select(".map .metric .metricValue").classed("hidden", false);
    d3.select(".map .metric .pumaName").classed("hidden", false);
    d3.select(".map .metric .metricName").classed("hidden", false);
  }
});

dispatch.on("load.racialCompositionCharts", function(racial_comp_data, metrics_all, city_state_us_racial_metrics, search_data, puma_city_state_mapping, pumas_zipcode, pumas_bboxes, cities_bboxes) {

  // set chart params
  var width = 200, // set max width of bar
      height = 136,
      margin = {top: 0, right: 65, bottom: 0, left: 60}
      margin_noaxis = {top: 0, right: 65, bottom: 0, left: 0};

  var nationalData = racial_comp_data.filter(function(d) { return d.geo_name === "USA"});

  var races = nationalData.map(function(d) { return d.race; });
  var colors = ['#1696D2', '#FDBF11', '#55B748', '#EC008B'];

  var nationalSvg = d3.select(".populationRaceEthnicity .chart.national")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height);

  var nationalBarChart = makeBarChart()
    .width(width)
    .height(height)
    .margin(margin)
    .data(nationalData)
    .races(races)
    .colors(colors)
    .xValue("share")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(true);

  nationalSvg.call(nationalBarChart);

  var stateData = racial_comp_data.filter(function(d) { return d.geo_name === selectedState;});

  var stateSvg = d3.select(".populationRaceEthnicity .chart.state")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height);

  var stateBarChart = makeBarChart()
    .width(width)
    .height(height)
    .margin(margin)
    .data(stateData)
    .races(races)
    .colors(colors)
    .xValue("share")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(false);

  stateSvg.call(stateBarChart);

  var pumaData = racial_comp_data.filter(function(d) { return d.geo_name === selectedPuma;});

  var pumaSvg = d3.select(".populationRaceEthnicity .chart.puma")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height);

  var pumaBarChart = makeBarChart()
    .width(width)
    .height(height)
    .margin(margin)
    .data(pumaData)
    .races(races)
    .colors(colors)
    .xValue("share")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(false);

  pumaSvg.call(pumaBarChart);

  dispatch.on("geoSearched.racialCompositionCharts", function(selected_geo_name, selected_geo_id, selected_geo_level, has_bonus_info, source) {
    selected_geo_name = has_bonus_info === "1" ? selected_geo_name.slice(0, -1) : selected_geo_name;

    // get state the city or zipcode is in
    function getState(selected_geo_id, selected_geo_level) {
      if(selected_geo_level === "City") {
        return puma_city_state_mapping.filter(function(d) { return d.city === selected_geo_name; })[0].state_name;
      }
      else {
        var puma_id = pumas_zipcode.filter(function(d) { return d.zipcode === +selected_geo_id; })[0].puma_id;
        return puma_city_state_mapping.filter(function(d) { return d.puma_id === puma_id; })[0].state_name
      }
    }
    var state = getState(selected_geo_id, selected_geo_level);
    stateData = racial_comp_data.filter(function(d) { return d.geo_name === state; });
    
    stateBarChart
      .data(stateData)
      .margin(margin)
      .showAxis(true);

    stateSvg
      .attr("width", width + margin.left + margin.right)
      .call(stateBarChart);

    d3.select(".populationRaceEthnicity .chart.state h6").text(state);

    d3.select(".populationRaceEthnicity .chart.state").classed("hidden", false);
    
    nationalBarChart
      .margin(screenWidth < 999 ? margin : margin_noaxis)
      .showAxis(screenWidth < 999);

    nationalSvg
      .attr("width", screenWidth < 999 ? width + margin.right + margin.left : width + margin.right)
      .call(nationalBarChart);

    d3.select(".populationRaceEthnicity .chart.puma").classed("hidden", true);
    d3.select(".dashboard h3").classed("hidden", true);
    d3.selectAll(".dashboard .metricsWrapper").classed("hidden", true);
    d3.selectAll(".dashboard .cover").classed("hidden", false);
  });

  dispatch.on("clearSelection.racialCompositionCharts", function() {

    d3.select(".populationRaceEthnicity .chart.state").classed("hidden", true);
    d3.select(".populationRaceEthnicity .chart.puma").classed("hidden", true);
    
    nationalBarChart
      .margin(margin)
      .showAxis(true);

    nationalSvg
      .attr("width", width + margin.right + margin.left)
      .call(nationalBarChart);

    d3.select(".dashboard h3").classed("hidden", true);
    d3.selectAll(".dashboard .metricsWrapper").classed("hidden", true);
    d3.selectAll(".dashboard .cover").classed("hidden", false);
  });

  dispatch.on("pumaSelected.racialCompositionCharts", function(selected_geo_id, selected_geo_name, zipcodeSearch, source) {
    pumaData = racial_comp_data.filter(function(d) { return d.geo_id === selected_geo_id;});
    pumaBarChart.data(pumaData).showAxis(true);
    pumaSvg.call(pumaBarChart);

    d3.select(".populationRaceEthnicity .chart.puma h6").text(selected_geo_name);

    var state = puma_city_state_mapping.filter(function(d) { return +d.puma_id === selected_geo_id; })[0].state_name;
    stateData = racial_comp_data.filter(function(d) { return d.geo_name === state; });
    
    stateBarChart
      .data(stateData)
      .margin(screenWidth < 662 ? margin : margin_noaxis)
      .showAxis(screenWidth < 662);
    
    stateSvg
      .attr("width", screenWidth < 662 ? width + margin.right + margin.left : width + margin.right)
      .call(stateBarChart);

    d3.select(".populationRaceEthnicity .chart.state h6").text(state);

    nationalBarChart
      .margin(screenWidth < 999 ? margin : margin_noaxis)
      .showAxis(screenWidth < 999);

    nationalSvg
      .attr("width", screenWidth < 999 ? width + margin.right + margin.left : width + margin.right)
      .call(nationalBarChart);

    d3.select(".populationRaceEthnicity .chart.puma").classed("hidden", false);
    d3.select(".populationRaceEthnicity .chart.state").classed("hidden", false);
  })

  dispatch.on("resize.racialCompositionCharts", function(screenWidth) {
    nationalBarChart
      .margin(screenWidth < 999 ? margin : margin_noaxis)
      .showAxis(screenWidth < 999);

    nationalSvg
      .attr("width", screenWidth < 999 ? width + margin.right + margin.left : width + margin.right)
      .call(nationalBarChart);

    stateBarChart
      .data(stateData)
      .margin(screenWidth < 662 ? margin : margin_noaxis)
      .showAxis(screenWidth < 662);
    
    stateSvg
      .attr("width", screenWidth < 662 ? width + margin.right + margin.left : width + margin.right)
      .call(stateBarChart);
  });
});

dispatch.on("load.dashboard", function(racial_comp_data, metrics_all, city_state_us_racial_metrics, search_data, puma_city_state_mapping, pumas_zipcode, pumas_bboxes, cities_bboxes) {

  // set chart params
  var width = screenWidth < 500 ? (screenWidth - 50) : 450,
      height = 70,
      margin = {top: 0, right: 20, bottom: 20, left: 20};

  // get ranges for Median Credit Score, Median Net Worth, and Mortgage Holders in Foreclosure
  var creditScoreDomain = d3.extent(metrics_all.filter(function(d) { return d.metric === "score_cleanpos_p50"; }), function(d) { return d.value; });
  var medianNetWorthDomain = d3.extent(metrics_all.filter(function(d) { return d.metric === "median net worth"; }), function(d) { return d.value; });
  var foreclosureDomain = [0, d3.max(metrics_all.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct"; }), function(d) { return d.value; })];

  var data = metrics_all.filter(function(d) { return d.geo_name === "USA" || d.geo_name === selectedState || d.geo_name === selectedPuma});

  var delinquentDebtSvg = d3.select(".delinquentDebt .stripchart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  var delinquentDebtChart = makeStripchart()
    .width(width)
    .height(height)
    .margin(margin)
    .domain([0, 1])
    .data(data.filter(function(d) { return d.metric === "has_delinq_pct"; }))
    .tickFormat(PCTFORMAT);

  delinquentDebtSvg.call(delinquentDebtChart);

  var emergencySavingsSvg = d3.select(".emergencySavings .stripchart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  var emergencySavingsChart = makeStripchart()
    .width(width)
    .height(height)
    .margin(margin)
    .domain([0, 1])
    .data(data.filter(function(d) { return d.metric === "at least 2000 emergency savings"; }))
    .tickFormat(PCTFORMAT);

  emergencySavingsSvg.call(emergencySavingsChart);

  var creditScoreSvg = d3.select(".creditScore .stripchart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  var creditScoreChart = makeStripchart()
    .width(width)
    .height(height)
    .margin(margin)
    .domain(creditScoreDomain)
    .data(data.filter(function(d) { return d.metric === "score_cleanpos_p50"; }))
    .tickFormat(null);

  creditScoreSvg.call(creditScoreChart);

  var inForeclosureSvg = d3.select(".inForeclosure .stripchart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  var inForeclosureChart = makeStripchart()
    .width(width)
    .height(height)
    .margin(margin)
    .domain(foreclosureDomain)
    .data(data.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct"; }))
    .tickFormat(PCTFORMAT_TWODECIMAL);

  inForeclosureSvg.call(inForeclosureChart);

  var netWorthSvg = d3.select(".netWorth .stripchart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  var netWorthChart = makeStripchart()
    .width(width)
    .height(height)
    .margin(margin)
    .domain(medianNetWorthDomain)
    .data(data.filter(function(d) { return d.metric === "median net worth"; }))
    .tickFormat(DOLLARFORMAT_SHORT);

  netWorthSvg.call(netWorthChart);

  var delinquentDebt = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "has_delinq_pct"; })[0].value;
  var delinquentStudentLoanDebt = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "share_of_student_loan_holders_with_delinquent_student_loans"; })[0].value;
  var lowIncomeHhldsHousingCostBurden = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "share_of_low_income_households_with_housing_cost_burden"; })[0].value;
  var emergencySavings = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "at least 2000 emergency savings"; })[0].value;
  var creditScore = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "score_cleanpos_p50"; })[0].value;
  var inForeclosure = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "had_foreclosure_2yr_pct"; })[0].value;
  var healthInsurance = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "share_of_people_with_health_insurance"; })[0].value;
  var netWorth = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "median net worth"; })[0].value;
  var homeownershipRate = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "homeownership_rate"; })[0].value;
  var homeValue = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "median_home_value_among_homeowners"; })[0].value;

  d3.select(".delinquentDebt .metricValue").text(isNaN(delinquentDebt) ? "Data not available" : PCTFORMAT(delinquentDebt));
  d3.select(".delinquentStudentLoanDebt .metricValue").text(isNaN(delinquentStudentLoanDebt) ? "Data not available" : PCTFORMAT(delinquentStudentLoanDebt));
  d3.select(".lowIncomeHhldsHousingCostBurden .metricValue").text(PCTFORMAT(lowIncomeHhldsHousingCostBurden));
  d3.select(".emergencySavings .metricValue").text(PCTFORMAT(emergencySavings));
  d3.select(".creditScore .metricValue").text(isNaN(creditScore) ? "Data not available" : creditScore);
  d3.select(".inForeclosure .metricValue").text(isNaN(inForeclosure) ? "Data not available" : PCTFORMAT_TWODECIMAL(inForeclosure));
  d3.select(".healthInsurance .metricValue").text(PCTFORMAT(healthInsurance));
  d3.select(".netWorth .metricValue").text(DOLLARFORMAT(netWorth));
  d3.select(".homeownershipRate .metricValue").text(PCTFORMAT(homeownershipRate));
  d3.select(".homeValue .metricValue").text(DOLLARFORMAT(homeValue));

  dispatch.on("pumaSelected.dashboard", function(selected_geo_id, selected_geo_name, zipcodeSearch) {
    // update print link
    d3.select(".buttons a").attr("href", "./print.html?puma_id=" + selected_geo_id);
    d3.select(".buttons").classed("disabled", false);

    data = metrics_all.filter(function(d) { return d.geo_name === "USA" || d.geo_name === selectedState || +d.geo_id === selected_geo_id});

    delinquentDebtChart.data(data.filter(function(d) { return d.metric === "has_delinq_pct"; }));  
    delinquentDebtSvg.call(delinquentDebtChart);
  
    emergencySavingsChart.data(data.filter(function(d) { return d.metric === "at least 2000 emergency savings"; }));  
    emergencySavingsSvg.call(emergencySavingsChart);
    
    creditScoreChart.data(data.filter(function(d) { return d.metric === "score_cleanpos_p50"; }));  
    creditScoreSvg.call(creditScoreChart);
    
    inForeclosureChart.data(data.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct"; }));  
    inForeclosureSvg.call(inForeclosureChart);
    
    netWorthChart.data(data.filter(function(d) { return d.metric === "median net worth"; }));
    netWorthSvg.call(netWorthChart);
  
    delinquentDebt = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "has_delinq_pct"; })[0].value;
    delinquentStudentLoanDebt = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "share_of_student_loan_holders_with_delinquent_student_loans"; })[0].value;
    lowIncomeHhldsHousingCostBurden = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "share_of_low_income_households_with_housing_cost_burden"; })[0].value;
    emergencySavings = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "at least 2000 emergency savings"; })[0].value;
    creditScore = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "score_cleanpos_p50"; })[0].value;
    inForeclosure = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "had_foreclosure_2yr_pct"; })[0].value;
    healthInsurance = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "share_of_people_with_health_insurance"; })[0].value;
    netWorth = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "median net worth"; })[0].value;
    homeownershipRate = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "homeownership_rate"; })[0].value;
    homeValue = data.filter(function(d) { return d.geo_level === "PUMA" && d.metric === "median_home_value_among_homeowners"; })[0].value;
  
    d3.select(".delinquentDebt .metricValue").text(isNaN(delinquentDebt) ? "Data not available" : PCTFORMAT(delinquentDebt));
    d3.select(".delinquentStudentLoanDebt .metricValue").text(isNaN(delinquentStudentLoanDebt) ? "Data not available" : PCTFORMAT(delinquentStudentLoanDebt));
    d3.select(".lowIncomeHhldsHousingCostBurden .metricValue").text(PCTFORMAT(lowIncomeHhldsHousingCostBurden));
    d3.select(".emergencySavings .metricValue").text(PCTFORMAT(emergencySavings));
    d3.select(".creditScore .metricValue").text(isNaN(creditScore) ? "Data not available" : creditScore);
    d3.select(".inForeclosure .metricValue").text(isNaN(inForeclosure) ? "Data not available" : PCTFORMAT_TWODECIMAL(inForeclosure));
    d3.select(".healthInsurance .metricValue").text(PCTFORMAT(healthInsurance));
    d3.select(".netWorth .metricValue").text(DOLLARFORMAT(netWorth));
    d3.select(".homeownershipRate .metricValue").text(PCTFORMAT(homeownershipRate));
    d3.select(".homeValue .metricValue").text(DOLLARFORMAT(homeValue));

    d3.selectAll(".dashboard .metricsWrapper").classed("hidden", false);
    d3.selectAll(".dashboard .cover").classed("hidden", true);

    d3.select(".dashboard .pumaName").text(selected_geo_name);
    d3.select(".dashboard h3").classed("hidden", false);

    d3.select(".dashboard").classed("inactive", false);
  });

  dispatch.on("resize.dashboard", function(screenWidth) {
    width = screenWidth < 500 ? (screenWidth - 50) : 450;

    delinquentDebtSvg.attr("width", width);
    delinquentDebtChart.width(width);
    delinquentDebtSvg.call(delinquentDebtChart);

    emergencySavingsSvg.attr("width", width);
    emergencySavingsChart.width(width);
    emergencySavingsSvg.call(emergencySavingsChart);

    creditScoreSvg.attr("width", width);
    creditScoreChart.width(width);
    creditScoreSvg.call(creditScoreChart);

    inForeclosureSvg.attr("width", width);
    inForeclosureChart.width(width);
    inForeclosureSvg.call(inForeclosureChart);

    netWorthSvg.attr("width", width);
    netWorthChart.width(width);
    netWorthSvg.call(netWorthChart);
  });
});

dispatch.on("load.modal", function(racial_comp_data, metrics_all, city_state_us_racial_metrics, search_data, puma_city_state_mapping, pumas_zipcode, pumas_bboxes, cities_bboxes) {

  // update labels
  d3.select(".modal .cityName span").text(selectedCity);
  d3.selectAll(".modal .chart.city .geoName").text(selectedCity);
  d3.selectAll(".modal .chart.state .geoName").text(selectedState);

  // set chart params
  var width = 150,
      overallHeight = 32,
      raceHeight = 150,
      margin = {top: 0, right: 90, bottom: 0, left: 155};

  width = screenWidth < 550 ? screenWidth - 70 - margin.left - margin.right : 150;

  var races = ["Residents of color (total)", "AAPI", "Black", "Hispanic", "White"];

  var nationalData = city_state_us_racial_metrics.filter(function(d) { return d.geo_name === "USA"; });
  var stateData = city_state_us_racial_metrics.filter(function(d) { return d.geo_name === selectedState; });
  var cityData = city_state_us_racial_metrics.filter(function(d) { return d.geo_name === selectedCity; });


  // NATIONAL CHARTS
  var nationalOverallSvg_DelinqDebt = d3.select(".modal .delinquentDebt .chart.national .chart.overall")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", overallHeight);

  var nationalOverallBarChart_DelinqDebt = makeBarChart()
    .width(width)
    .height(overallHeight)
    .margin(margin)
    .data(nationalData.filter(function(d) { return d.metric === "has_delinq_pct" && d.race === "Overall"; }))
    .races(["Overall"])
    .colors(["#000"])
    .xValue("value")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(true);

  nationalOverallSvg_DelinqDebt.call(nationalOverallBarChart_DelinqDebt);

  var nationalRaceSvg_DelinqDebt = d3.select(".modal .delinquentDebt .chart.national .chart.breakdown")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", raceHeight);

  var nationalRaceBarChart_DelinqDebt = makeBarChart()
    .width(width)
    .height(raceHeight)
    .margin(margin)
    .data(nationalData.filter(function(d) { return d.metric === "has_delinq_pct" && d.race !== "Overall"; }))
    .races(races)
    .colors(["#1696D2"])
    .xValue("value")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(true);

  nationalRaceSvg_DelinqDebt.call(nationalRaceBarChart_DelinqDebt);


  var nationalOverallSvg_EmergSavings = d3.select(".modal .emergencySavings .chart.national .chart.overall")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", overallHeight);

  var nationalOverallBarChart_EmergSavings = makeBarChart()
    .width(width)
    .height(overallHeight)
    .margin(margin)
    .data(nationalData.filter(function(d) { return d.metric === "at least 2000 emergency savings" && d.race === "Overall"; }))
    .races(["Overall"])
    .colors(["#000"])
    .xValue("value")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(true);

  nationalOverallSvg_EmergSavings.call(nationalOverallBarChart_EmergSavings);

  var nationalRaceSvg_EmergSavings = d3.select(".modal .emergencySavings .chart.national .chart.breakdown")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", raceHeight);

  var nationalRaceBarChart_EmergSavings = makeBarChart()
    .width(width)
    .height(raceHeight)
    .margin(margin)
    .data(nationalData.filter(function(d) { return d.metric === "at least 2000 emergency savings" && d.race !== "Overall"; }))
    .races(races)
    .colors(["#1696D2"])
    .xValue("value")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(true);

  nationalRaceSvg_EmergSavings.call(nationalRaceBarChart_EmergSavings);


  var nationalOverallSvg_CreditScore = d3.select(".modal .creditScore .chart.national .chart.overall")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", overallHeight);

  var nationalOverallBarChart_CreditScore = makeBarChart()
    .width(width)
    .height(overallHeight)
    .margin(margin)
    .data(nationalData.filter(function(d) { return d.metric === "score_cleanpos_p50" && d.race === "Overall"; }))
    .races(["Overall"])
    .colors(["#000"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "score_cleanpos_p50"}), function(d) { return d.value; })])
    .labelFormat("")
    .showAxis(true);

  nationalOverallSvg_CreditScore.call(nationalOverallBarChart_CreditScore);

  var nationalRaceSvg_CreditScore = d3.select(".modal .creditScore .chart.national .chart.breakdown")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", raceHeight);

  var nationalRaceBarChart_CreditScore = makeBarChart()
    .width(width)
    .height(raceHeight)
    .margin(margin)
    .data(nationalData.filter(function(d) { return d.metric === "score_cleanpos_p50" && d.race !== "Overall"; }))
    .races(races)
    .colors(["#1696D2"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "score_cleanpos_p50"}), function(d) { return d.value; })])
    .labelFormat("")
    .showAxis(true);

  nationalRaceSvg_CreditScore.call(nationalRaceBarChart_CreditScore);


  var nationalOverallSvg_Foreclosure = d3.select(".modal .inForeclosure .chart.national .chart.overall")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", overallHeight);

  var nationalOverallBarChart_Foreclosure = makeBarChart()
    .width(width)
    .height(overallHeight)
    .margin(margin)
    .data(nationalData.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct" && d.race === "Overall"; }))
    .races(["Overall"])
    .colors(["#000"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct"}), function(d) { return d.value; })])
    .labelFormat("percent_twodecimal")
    .showAxis(true);

  nationalOverallSvg_Foreclosure.call(nationalOverallBarChart_Foreclosure);

  var nationalRaceSvg_Foreclosure = d3.select(".modal .inForeclosure .chart.national .chart.breakdown")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", raceHeight);

  var nationalRaceBarChart_Foreclosure = makeBarChart()
    .width(width)
    .height(raceHeight)
    .margin(margin)
    .data(nationalData.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct" && d.race !== "Overall"; }))
    .races(races)
    .colors(["#1696D2"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct"}), function(d) { return d.value; })])
    .labelFormat("percent_twodecimal")
    .showAxis(true);

  nationalRaceSvg_Foreclosure.call(nationalRaceBarChart_Foreclosure);

  var nationalOverallSvg_NetWorth = d3.select(".modal .netWorth .chart.national .chart.overall")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", overallHeight);

  var nationalOverallBarChart_NetWorth = makeBarChart()
    .width(width)
    .height(overallHeight)
    .margin(margin)
    .data(nationalData.filter(function(d) { return d.metric === "median net worth" && d.race === "Overall"; }))
    .races(["Overall"])
    .colors(["#000"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "median net worth"}), function(d) { return d.value; })])
    .labelFormat("dollar")
    .showAxis(true);

  nationalOverallSvg_NetWorth.call(nationalOverallBarChart_NetWorth);

  var nationalRaceSvg_NetWorth = d3.select(".modal .netWorth .chart.national .chart.breakdown")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", raceHeight);

  var nationalRaceBarChart_NetWorth = makeBarChart()
    .width(width)
    .height(raceHeight)
    .margin(margin)
    .data(nationalData.filter(function(d) { return d.metric === "median net worth" && d.race !== "Overall"; }))
    .races(races)
    .colors(["#1696D2"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "median net worth"}), function(d) { return d.value; })])
    .labelFormat("dollar")
    .showAxis(true);

  nationalRaceSvg_NetWorth.call(nationalRaceBarChart_NetWorth);

  // STATE CHARTS
  var stateOverallSvg_DelinqDebt = d3.select(".modal .delinquentDebt .chart.state .chart.overall")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", overallHeight);

  var stateOverallBarChart_DelinqDebt = makeBarChart()
    .width(width)
    .height(overallHeight)
    .margin(margin)
    .data(stateData.filter(function(d) { return d.metric === "has_delinq_pct" && d.race === "Overall"; }))
    .races(["Overall"])
    .colors(["#000"])
    .xValue("value")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(true);

  stateOverallSvg_DelinqDebt.call(stateOverallBarChart_DelinqDebt);

  var stateRaceSvg_DelinqDebt = d3.select(".modal .delinquentDebt .chart.state .chart.breakdown")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", raceHeight);

  var stateRaceBarChart_DelinqDebt = makeBarChart()
    .width(width)
    .height(raceHeight)
    .margin(margin)
    .data(stateData.filter(function(d) { return d.metric === "has_delinq_pct" && d.race !== "Overall"; }))
    .races(races)
    .colors(["#1696D2"])
    .xValue("value")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(true);

  stateRaceSvg_DelinqDebt.call(stateRaceBarChart_DelinqDebt);


  var stateOverallSvg_EmergSavings = d3.select(".modal .emergencySavings .chart.state .chart.overall")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", overallHeight);

  var stateOverallBarChart_EmergSavings = makeBarChart()
    .width(width)
    .height(overallHeight)
    .margin(margin)
    .data(stateData.filter(function(d) { return d.metric === "at least 2000 emergency savings" && d.race === "Overall"; }))
    .races(["Overall"])
    .colors(["#000"])
    .xValue("value")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(true);

  stateOverallSvg_EmergSavings.call(stateOverallBarChart_EmergSavings);

  var stateRaceSvg_EmergSavings = d3.select(".modal .emergencySavings .chart.state .chart.breakdown")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", raceHeight);

  var stateRaceBarChart_EmergSavings = makeBarChart()
    .width(width)
    .height(raceHeight)
    .margin(margin)
    .data(stateData.filter(function(d) { return d.metric === "at least 2000 emergency savings" && d.race !== "Overall"; }))
    .races(races)
    .colors(["#1696D2"])
    .xValue("value")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(true);

  stateRaceSvg_EmergSavings.call(stateRaceBarChart_EmergSavings);


  var stateOverallSvg_CreditScore = d3.select(".modal .creditScore .chart.state .chart.overall")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", overallHeight);

  var stateOverallBarChart_CreditScore = makeBarChart()
    .width(width)
    .height(overallHeight)
    .margin(margin)
    .data(stateData.filter(function(d) { return d.metric === "score_cleanpos_p50" && d.race === "Overall"; }))
    .races(["Overall"])
    .colors(["#000"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "score_cleanpos_p50"}), function(d) { return d.value; })])
    .labelFormat("")
    .showAxis(true);

  stateOverallSvg_CreditScore.call(stateOverallBarChart_CreditScore);

  var stateRaceSvg_CreditScore = d3.select(".modal .creditScore .chart.state .chart.breakdown")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", raceHeight);

  var stateRaceBarChart_CreditScore = makeBarChart()
    .width(width)
    .height(raceHeight)
    .margin(margin)
    .data(stateData.filter(function(d) { return d.metric === "score_cleanpos_p50" && d.race !== "Overall"; }))
    .races(races)
    .colors(["#1696D2"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "score_cleanpos_p50"}), function(d) { return d.value; })])
    .labelFormat("")
    .showAxis(true);

  stateRaceSvg_CreditScore.call(stateRaceBarChart_CreditScore);


  var stateOverallSvg_Foreclosure = d3.select(".modal .inForeclosure .chart.state .chart.overall")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", overallHeight);

  var stateOverallBarChart_Foreclosure = makeBarChart()
    .width(width)
    .height(overallHeight)
    .margin(margin)
    .data(stateData.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct" && d.race === "Overall"; }))
    .races(["Overall"])
    .colors(["#000"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct"}), function(d) { return d.value; })])
    .labelFormat("percent_twodecimal")
    .showAxis(true);

  stateOverallSvg_Foreclosure.call(stateOverallBarChart_Foreclosure);

  var stateRaceSvg_Foreclosure = d3.select(".modal .inForeclosure .chart.state .chart.breakdown")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", raceHeight);

  var stateRaceBarChart_Foreclosure = makeBarChart()
    .width(width)
    .height(raceHeight)
    .margin(margin)
    .data(stateData.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct" && d.race !== "Overall"; }))
    .races(races)
    .colors(["#1696D2"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct"}), function(d) { return d.value; })])
    .labelFormat("percent_twodecimal")
    .showAxis(true);

  stateRaceSvg_Foreclosure.call(stateRaceBarChart_Foreclosure);

  var stateOverallSvg_NetWorth = d3.select(".modal .netWorth .chart.state .chart.overall")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", overallHeight);

  var stateOverallBarChart_NetWorth = makeBarChart()
    .width(width)
    .height(overallHeight)
    .margin(margin)
    .data(stateData.filter(function(d) { return d.metric === "median net worth" && d.race === "Overall"; }))
    .races(["Overall"])
    .colors(["#000"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "median net worth"}), function(d) { return d.value; })])
    .labelFormat("dollar")
    .showAxis(true);

  stateOverallSvg_NetWorth.call(stateOverallBarChart_NetWorth);

  var stateRaceSvg_NetWorth = d3.select(".modal .netWorth .chart.state .chart.breakdown")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", raceHeight);

  var stateRaceBarChart_NetWorth = makeBarChart()
    .width(width)
    .height(raceHeight)
    .margin(margin)
    .data(stateData.filter(function(d) { return d.metric === "median net worth" && d.race !== "Overall"; }))
    .races(races)
    .colors(["#1696D2"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "median net worth"}), function(d) { return d.value; })])
    .labelFormat("dollar")
    .showAxis(true);

  stateRaceSvg_NetWorth.call(stateRaceBarChart_NetWorth);

  // CITY CHARTS
  var cityOverallSvg_DelinqDebt = d3.select(".modal .delinquentDebt .chart.city .chart.overall")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", overallHeight);

  var cityOverallBarChart_DelinqDebt = makeBarChart()
    .width(width)
    .height(overallHeight)
    .margin(margin)
    .data(cityData.filter(function(d) { return d.metric === "has_delinq_pct" && d.race === "Overall"; }))
    .races(["Overall"])
    .colors(["#000"])
    .xValue("value")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(true);

  cityOverallSvg_DelinqDebt.call(cityOverallBarChart_DelinqDebt);

  var cityRaceSvg_DelinqDebt = d3.select(".modal .delinquentDebt .chart.city .chart.breakdown")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", raceHeight);

  var cityRaceBarChart_DelinqDebt = makeBarChart()
    .width(width)
    .height(raceHeight)
    .margin(margin)
    .data(cityData.filter(function(d) { return d.metric === "has_delinq_pct" && d.race !== "Overall"; }))
    .races(races)
    .colors(["#1696D2"])
    .xValue("value")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(true);

  cityRaceSvg_DelinqDebt.call(cityRaceBarChart_DelinqDebt);


  var cityOverallSvg_EmergSavings = d3.select(".modal .emergencySavings .chart.city .chart.overall")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", overallHeight);

  var cityOverallBarChart_EmergSavings = makeBarChart()
    .width(width)
    .height(overallHeight)
    .margin(margin)
    .data(cityData.filter(function(d) { return d.metric === "at least 2000 emergency savings" && d.race === "Overall"; }))
    .races(["Overall"])
    .colors(["#000"])
    .xValue("value")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(true);

  cityOverallSvg_EmergSavings.call(cityOverallBarChart_EmergSavings);

  var cityRaceSvg_EmergSavings = d3.select(".modal .emergencySavings .chart.city .chart.breakdown")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", raceHeight);

  var cityRaceBarChart_EmergSavings = makeBarChart()
    .width(width)
    .height(raceHeight)
    .margin(margin)
    .data(cityData.filter(function(d) { return d.metric === "at least 2000 emergency savings" && d.race !== "Overall"; }))
    .races(races)
    .colors(["#1696D2"])
    .xValue("value")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(true);

  cityRaceSvg_EmergSavings.call(cityRaceBarChart_EmergSavings);


  var cityOverallSvg_CreditScore = d3.select(".modal .creditScore .chart.city .chart.overall")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", overallHeight);

  var cityOverallBarChart_CreditScore = makeBarChart()
    .width(width)
    .height(overallHeight)
    .margin(margin)
    .data(cityData.filter(function(d) { return d.metric === "score_cleanpos_p50" && d.race === "Overall"; }))
    .races(["Overall"])
    .colors(["#000"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "score_cleanpos_p50"}), function(d) { return d.value; })])
    .labelFormat("")
    .showAxis(true);

  cityOverallSvg_CreditScore.call(cityOverallBarChart_CreditScore);

  var cityRaceSvg_CreditScore = d3.select(".modal .creditScore .chart.city .chart.breakdown")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", raceHeight);

  var cityRaceBarChart_CreditScore = makeBarChart()
    .width(width)
    .height(raceHeight)
    .margin(margin)
    .data(cityData.filter(function(d) { return d.metric === "score_cleanpos_p50" && d.race !== "Overall"; }))
    .races(races)
    .colors(["#1696D2"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "score_cleanpos_p50"}), function(d) { return d.value; })])
    .labelFormat("")
    .showAxis(true);

  cityRaceSvg_CreditScore.call(cityRaceBarChart_CreditScore);


  var cityOverallSvg_Foreclosure = d3.select(".modal .inForeclosure .chart.city .chart.overall")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", overallHeight);

  var cityOverallBarChart_Foreclosure = makeBarChart()
    .width(width)
    .height(overallHeight)
    .margin(margin)
    .data(cityData.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct" && d.race === "Overall"; }))
    .races(["Overall"])
    .colors(["#000"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct"}), function(d) { return d.value; })])
    .labelFormat("percent_twodecimal")
    .showAxis(true);

  cityOverallSvg_Foreclosure.call(cityOverallBarChart_Foreclosure);

  var cityRaceSvg_Foreclosure = d3.select(".modal .inForeclosure .chart.city .chart.breakdown")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", raceHeight);

  var cityRaceBarChart_Foreclosure = makeBarChart()
    .width(width)
    .height(raceHeight)
    .margin(margin)
    .data(cityData.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct" && d.race !== "Overall"; }))
    .races(races)
    .colors(["#1696D2"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct"}), function(d) { return d.value; })])
    .labelFormat("percent_twodecimal")
    .showAxis(true);

  cityRaceSvg_Foreclosure.call(cityRaceBarChart_Foreclosure);

  var cityOverallSvg_NetWorth = d3.select(".modal .netWorth .chart.city .chart.overall")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", overallHeight);

  var cityOverallBarChart_NetWorth = makeBarChart()
    .width(width)
    .height(overallHeight)
    .margin(margin)
    .data(cityData.filter(function(d) { return d.metric === "median net worth" && d.race === "Overall"; }))
    .races(["Overall"])
    .colors(["#000"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "median net worth"}), function(d) { return d.value; })])
    .labelFormat("dollar")
    .showAxis(true);

  cityOverallSvg_NetWorth.call(cityOverallBarChart_NetWorth);

  var cityRaceSvg_NetWorth = d3.select(".modal .netWorth .chart.city .chart.breakdown")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", raceHeight);

  var cityRaceBarChart_NetWorth = makeBarChart()
    .width(width)
    .height(raceHeight)
    .margin(margin)
    .data(cityData.filter(function(d) { return d.metric === "median net worth" && d.race !== "Overall"; }))
    .races(races)
    .colors(["#1696D2"])
    .xValue("value")
    .domain([0, d3.max(city_state_us_racial_metrics.filter(function(d) { return d.metric === "median net worth"}), function(d) { return d.value; })])
    .labelFormat("dollar")
    .showAxis(true);

  cityRaceSvg_NetWorth.call(cityRaceBarChart_NetWorth);

  dispatch.on("geoSearched.modal", function(selected_geo_name, selected_geo_id, selected_geo_level, has_bonus_info, source) {
    if(selected_geo_level === "City") {
      selected_geo_name = has_bonus_info === "1" ? selected_geo_name.slice(0, -1) : selected_geo_name;

      var state = puma_city_state_mapping.filter(function(d) { return d.city === selected_geo_name})[0].state_name;
    
      d3.select(".modal .cityName span").text(selected_geo_name);
      d3.selectAll(".modal .chart.city .geoName").text(selected_geo_name);
      d3.selectAll(".modal .chart.state .geoName").text(state);
  
      stateData = city_state_us_racial_metrics.filter(function(d) { return d.geo_name === state; });
      cityData = city_state_us_racial_metrics.filter(function(d) { return d.geo_name === selected_geo_name; });
  
      stateOverallBarChart_DelinqDebt.data(stateData.filter(function(d) { return d.metric === "has_delinq_pct" && d.race === "Overall"; }));
      stateOverallSvg_DelinqDebt.call(stateOverallBarChart_DelinqDebt);
      stateRaceBarChart_DelinqDebt.data(stateData.filter(function(d) { return d.metric === "has_delinq_pct" && d.race !== "Overall"; }));
      stateRaceSvg_DelinqDebt.call(stateRaceBarChart_DelinqDebt);
  
      stateOverallBarChart_EmergSavings.data(stateData.filter(function(d) { return d.metric === "at least 2000 emergency savings" && d.race === "Overall"; }));
      stateOverallSvg_EmergSavings.call(stateOverallBarChart_EmergSavings);
      stateRaceBarChart_EmergSavings.data(stateData.filter(function(d) { return d.metric === "at least 2000 emergency savings" && d.race !== "Overall"; }));
      stateRaceSvg_EmergSavings.call(stateRaceBarChart_EmergSavings);
  
      stateOverallBarChart_CreditScore.data(stateData.filter(function(d) { return d.metric === "score_cleanpos_p50" && d.race === "Overall"; }));
      stateOverallSvg_CreditScore.call(stateOverallBarChart_CreditScore);
      stateRaceBarChart_CreditScore.data(stateData.filter(function(d) { return d.metric === "score_cleanpos_p50" && d.race !== "Overall"; }));
      stateRaceSvg_CreditScore.call(stateRaceBarChart_CreditScore);
  
      stateOverallBarChart_Foreclosure.data(stateData.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct" && d.race === "Overall"; }));
      stateOverallSvg_Foreclosure.call(stateOverallBarChart_Foreclosure);
      stateRaceBarChart_Foreclosure.data(stateData.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct" && d.race !== "Overall"; }));
      stateRaceSvg_Foreclosure.call(stateRaceBarChart_Foreclosure);
  
      stateOverallBarChart_NetWorth.data(stateData.filter(function(d) { return d.metric === "median net worth" && d.race === "Overall"; }));
      stateOverallSvg_NetWorth.call(stateOverallBarChart_NetWorth);
      stateRaceBarChart_NetWorth.data(stateData.filter(function(d) { return d.metric === "median net worth" && d.race !== "Overall"; }));
      stateRaceSvg_NetWorth.call(stateRaceBarChart_NetWorth);
  
      cityOverallBarChart_DelinqDebt.data(cityData.filter(function(d) { return d.metric === "has_delinq_pct" && d.race === "Overall"; }));
      cityOverallSvg_DelinqDebt.call(cityOverallBarChart_DelinqDebt);
      cityRaceBarChart_DelinqDebt.data(cityData.filter(function(d) { return d.metric === "has_delinq_pct" && d.race !== "Overall"; }));
      cityRaceSvg_DelinqDebt.call(cityRaceBarChart_DelinqDebt);
  
      cityOverallBarChart_EmergSavings.data(cityData.filter(function(d) { return d.metric === "at least 2000 emergency savings" && d.race === "Overall"; }));
      cityOverallSvg_EmergSavings.call(cityOverallBarChart_EmergSavings);
      cityRaceBarChart_EmergSavings.data(cityData.filter(function(d) { return d.metric === "at least 2000 emergency savings" && d.race !== "Overall"; }));
      cityRaceSvg_EmergSavings.call(cityRaceBarChart_EmergSavings);
  
      cityOverallBarChart_CreditScore.data(cityData.filter(function(d) { return d.metric === "score_cleanpos_p50" && d.race === "Overall"; }));
      cityOverallSvg_CreditScore.call(cityOverallBarChart_CreditScore);
      cityRaceBarChart_CreditScore.data(cityData.filter(function(d) { return d.metric === "score_cleanpos_p50" && d.race !== "Overall"; }));
      cityRaceSvg_CreditScore.call(cityRaceBarChart_CreditScore);
  
      cityOverallBarChart_Foreclosure.data(cityData.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct" && d.race === "Overall"; }));
      cityOverallSvg_Foreclosure.call(cityOverallBarChart_Foreclosure);
      cityRaceBarChart_Foreclosure.data(cityData.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct" && d.race !== "Overall"; }));
      cityRaceSvg_Foreclosure.call(cityRaceBarChart_Foreclosure);
  
      cityOverallBarChart_NetWorth.data(cityData.filter(function(d) { return d.metric === "median net worth" && d.race === "Overall"; }));
      cityOverallSvg_NetWorth.call(cityOverallBarChart_NetWorth);
      cityRaceBarChart_NetWorth.data(cityData.filter(function(d) { return d.metric === "median net worth" && d.race !== "Overall"; }));
      cityRaceSvg_NetWorth.call(cityRaceBarChart_NetWorth);
    }
  });

  dispatch.on("pumaSelected.modal", function(selected_geo_id, selected_geo_name, zipcodeSearch) {
    var city = puma_city_state_mapping.filter(function(d) { return +d.puma_id === selected_geo_id; })[0].city;

    if(city !== "NA") {
      var state = puma_city_state_mapping.filter(function(d) { return d.city === city})[0].state_name;
    
      d3.select(".modal .cityName span").text(city);
      d3.selectAll(".modal .chart.city .geoName").text(city);
      d3.selectAll(".modal .chart.state .geoName").text(state);
  
      stateData = city_state_us_racial_metrics.filter(function(d) { return d.geo_name === state; });
      cityData = city_state_us_racial_metrics.filter(function(d) { return d.geo_name === city; });
  
      stateOverallBarChart_DelinqDebt.data(stateData.filter(function(d) { return d.metric === "has_delinq_pct" && d.race === "Overall"; }));
      stateOverallSvg_DelinqDebt.call(stateOverallBarChart_DelinqDebt);
      stateRaceBarChart_DelinqDebt.data(stateData.filter(function(d) { return d.metric === "has_delinq_pct" && d.race !== "Overall"; }));
      stateRaceSvg_DelinqDebt.call(stateRaceBarChart_DelinqDebt);
  
      stateOverallBarChart_EmergSavings.data(stateData.filter(function(d) { return d.metric === "at least 2000 emergency savings" && d.race === "Overall"; }));
      stateOverallSvg_EmergSavings.call(stateOverallBarChart_EmergSavings);
      stateRaceBarChart_EmergSavings.data(stateData.filter(function(d) { return d.metric === "at least 2000 emergency savings" && d.race !== "Overall"; }));
      stateRaceSvg_EmergSavings.call(stateRaceBarChart_EmergSavings);
  
      stateOverallBarChart_CreditScore.data(stateData.filter(function(d) { return d.metric === "score_cleanpos_p50" && d.race === "Overall"; }));
      stateOverallSvg_CreditScore.call(stateOverallBarChart_CreditScore);
      stateRaceBarChart_CreditScore.data(stateData.filter(function(d) { return d.metric === "score_cleanpos_p50" && d.race !== "Overall"; }));
      stateRaceSvg_CreditScore.call(stateRaceBarChart_CreditScore);
  
      stateOverallBarChart_Foreclosure.data(stateData.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct" && d.race === "Overall"; }));
      stateOverallSvg_Foreclosure.call(stateOverallBarChart_Foreclosure);
      stateRaceBarChart_Foreclosure.data(stateData.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct" && d.race !== "Overall"; }));
      stateRaceSvg_Foreclosure.call(stateRaceBarChart_Foreclosure);
  
      stateOverallBarChart_NetWorth.data(stateData.filter(function(d) { return d.metric === "median net worth" && d.race === "Overall"; }));
      stateOverallSvg_NetWorth.call(stateOverallBarChart_NetWorth);
      stateRaceBarChart_NetWorth.data(stateData.filter(function(d) { return d.metric === "median net worth" && d.race !== "Overall"; }));
      stateRaceSvg_NetWorth.call(stateRaceBarChart_NetWorth);
  
      cityOverallBarChart_DelinqDebt.data(cityData.filter(function(d) { return d.metric === "has_delinq_pct" && d.race === "Overall"; }));
      cityOverallSvg_DelinqDebt.call(cityOverallBarChart_DelinqDebt);
      cityRaceBarChart_DelinqDebt.data(cityData.filter(function(d) { return d.metric === "has_delinq_pct" && d.race !== "Overall"; }));
      cityRaceSvg_DelinqDebt.call(cityRaceBarChart_DelinqDebt);
  
      cityOverallBarChart_EmergSavings.data(cityData.filter(function(d) { return d.metric === "at least 2000 emergency savings" && d.race === "Overall"; }));
      cityOverallSvg_EmergSavings.call(cityOverallBarChart_EmergSavings);
      cityRaceBarChart_EmergSavings.data(cityData.filter(function(d) { return d.metric === "at least 2000 emergency savings" && d.race !== "Overall"; }));
      cityRaceSvg_EmergSavings.call(cityRaceBarChart_EmergSavings);
  
      cityOverallBarChart_CreditScore.data(cityData.filter(function(d) { return d.metric === "score_cleanpos_p50" && d.race === "Overall"; }));
      cityOverallSvg_CreditScore.call(cityOverallBarChart_CreditScore);
      cityRaceBarChart_CreditScore.data(cityData.filter(function(d) { return d.metric === "score_cleanpos_p50" && d.race !== "Overall"; }));
      cityRaceSvg_CreditScore.call(cityRaceBarChart_CreditScore);
  
      cityOverallBarChart_Foreclosure.data(cityData.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct" && d.race === "Overall"; }));
      cityOverallSvg_Foreclosure.call(cityOverallBarChart_Foreclosure);
      cityRaceBarChart_Foreclosure.data(cityData.filter(function(d) { return d.metric === "had_foreclosure_2yr_pct" && d.race !== "Overall"; }));
      cityRaceSvg_Foreclosure.call(cityRaceBarChart_Foreclosure);
  
      cityOverallBarChart_NetWorth.data(cityData.filter(function(d) { return d.metric === "median net worth" && d.race === "Overall"; }));
      cityOverallSvg_NetWorth.call(cityOverallBarChart_NetWorth);
      cityRaceBarChart_NetWorth.data(cityData.filter(function(d) { return d.metric === "median net worth" && d.race !== "Overall"; }));
      cityRaceSvg_NetWorth.call(cityRaceBarChart_NetWorth);
    }
  });

  dispatch.on("resize.modal", function(screenWidth) {
    var chartWidth = screenWidth < 550 ? screenWidth - 70 - margin.left - margin.right : 150;

    nationalOverallSvg_DelinqDebt.attr("width", chartWidth + margin.left + margin.right);
    nationalOverallBarChart_DelinqDebt.width(chartWidth);
    nationalOverallSvg_DelinqDebt.call(nationalOverallBarChart_DelinqDebt);
    nationalRaceSvg_DelinqDebt.attr("width", chartWidth + margin.left + margin.right);
    nationalRaceBarChart_DelinqDebt.width(chartWidth);
    nationalRaceSvg_DelinqDebt.call(nationalRaceBarChart_DelinqDebt);

    nationalOverallSvg_EmergSavings.attr("width", chartWidth + margin.left + margin.right);
    nationalOverallBarChart_EmergSavings.width(chartWidth);
    nationalOverallSvg_EmergSavings.call(nationalOverallBarChart_EmergSavings);
    nationalRaceSvg_EmergSavings.attr("width", chartWidth + margin.left + margin.right);
    nationalRaceBarChart_EmergSavings.width(chartWidth);
    nationalRaceSvg_EmergSavings.call(nationalRaceBarChart_EmergSavings);

    nationalOverallSvg_CreditScore.attr("width", chartWidth + margin.left + margin.right);
    nationalOverallBarChart_CreditScore.width(chartWidth);
    nationalOverallSvg_CreditScore.call(nationalOverallBarChart_CreditScore);
    nationalRaceSvg_CreditScore.attr("width", chartWidth + margin.left + margin.right);
    nationalRaceBarChart_CreditScore.width(chartWidth);
    nationalRaceSvg_CreditScore.call(nationalRaceBarChart_CreditScore);

    nationalOverallSvg_Foreclosure.attr("width", chartWidth + margin.left + margin.right);
    nationalOverallBarChart_Foreclosure.width(chartWidth);
    nationalOverallSvg_Foreclosure.call(nationalOverallBarChart_Foreclosure);
    nationalRaceSvg_Foreclosure.attr("width", chartWidth + margin.left + margin.right);
    nationalRaceBarChart_Foreclosure.width(chartWidth);
    nationalRaceSvg_Foreclosure.call(nationalRaceBarChart_Foreclosure);

    nationalOverallSvg_NetWorth.attr("width", chartWidth + margin.left + margin.right);
    nationalOverallBarChart_NetWorth.width(chartWidth);
    nationalOverallSvg_NetWorth.call(nationalOverallBarChart_NetWorth);
    nationalRaceSvg_NetWorth.attr("width", chartWidth + margin.left + margin.right);
    nationalRaceBarChart_NetWorth.width(chartWidth);
    nationalRaceSvg_NetWorth.call(nationalRaceBarChart_NetWorth);




    stateOverallSvg_DelinqDebt.attr("width", chartWidth + margin.left + margin.right);
    stateOverallBarChart_DelinqDebt.width(chartWidth);
    stateOverallSvg_DelinqDebt.call(stateOverallBarChart_DelinqDebt);
    stateRaceSvg_DelinqDebt.attr("width", chartWidth + margin.left + margin.right);
    stateRaceBarChart_DelinqDebt.width(chartWidth);
    stateRaceSvg_DelinqDebt.call(stateRaceBarChart_DelinqDebt);

    stateOverallSvg_EmergSavings.attr("width", chartWidth + margin.left + margin.right);
    stateOverallBarChart_EmergSavings.width(chartWidth);
    stateOverallSvg_EmergSavings.call(stateOverallBarChart_EmergSavings);
    stateRaceSvg_EmergSavings.attr("width", chartWidth + margin.left + margin.right);
    stateRaceBarChart_EmergSavings.width(chartWidth);
    stateRaceSvg_EmergSavings.call(stateRaceBarChart_EmergSavings);

    stateOverallSvg_CreditScore.attr("width", chartWidth + margin.left + margin.right);
    stateOverallBarChart_CreditScore.width(chartWidth);
    stateOverallSvg_CreditScore.call(stateOverallBarChart_CreditScore);
    stateRaceSvg_CreditScore.attr("width", chartWidth + margin.left + margin.right);
    stateRaceBarChart_CreditScore.width(chartWidth);
    stateRaceSvg_CreditScore.call(stateRaceBarChart_CreditScore);

    stateOverallSvg_Foreclosure.attr("width", chartWidth + margin.left + margin.right);
    stateOverallBarChart_Foreclosure.width(chartWidth);
    stateOverallSvg_Foreclosure.call(stateOverallBarChart_Foreclosure);
    stateRaceSvg_Foreclosure.attr("width", chartWidth + margin.left + margin.right);
    stateRaceBarChart_Foreclosure.width(chartWidth);
    stateRaceSvg_Foreclosure.call(stateRaceBarChart_Foreclosure);

    stateOverallSvg_NetWorth.attr("width", chartWidth + margin.left + margin.right);
    stateOverallBarChart_NetWorth.width(chartWidth);
    stateOverallSvg_NetWorth.call(stateOverallBarChart_NetWorth);
    stateRaceSvg_NetWorth.attr("width", chartWidth + margin.left + margin.right);
    stateRaceBarChart_NetWorth.width(chartWidth);
    stateRaceSvg_NetWorth.call(stateRaceBarChart_NetWorth);

    cityOverallSvg_DelinqDebt.attr("width", chartWidth + margin.left + margin.right);
    cityOverallBarChart_DelinqDebt.width(chartWidth);
    cityOverallSvg_DelinqDebt.call(cityOverallBarChart_DelinqDebt);
    cityRaceSvg_DelinqDebt.attr("width", chartWidth + margin.left + margin.right);
    cityRaceBarChart_DelinqDebt.width(chartWidth);
    cityRaceSvg_DelinqDebt.call(cityRaceBarChart_DelinqDebt);

    cityOverallSvg_EmergSavings.attr("width", chartWidth + margin.left + margin.right);
    cityOverallBarChart_EmergSavings.width(chartWidth);
    cityOverallSvg_EmergSavings.call(cityOverallBarChart_EmergSavings);
    cityRaceSvg_EmergSavings.attr("width", chartWidth + margin.left + margin.right);
    cityRaceBarChart_EmergSavings.width(chartWidth);
    cityRaceSvg_EmergSavings.call(cityRaceBarChart_EmergSavings);

    cityOverallSvg_CreditScore.attr("width", chartWidth + margin.left + margin.right);
    cityOverallBarChart_CreditScore.width(chartWidth);
    cityOverallSvg_CreditScore.call(cityOverallBarChart_CreditScore);
    cityRaceSvg_CreditScore.attr("width", chartWidth + margin.left + margin.right);
    cityRaceBarChart_CreditScore.width(chartWidth);
    cityRaceSvg_CreditScore.call(cityRaceBarChart_CreditScore);

    cityOverallSvg_Foreclosure.attr("width", chartWidth + margin.left + margin.right);
    cityOverallBarChart_Foreclosure.width(chartWidth);
    cityOverallSvg_Foreclosure.call(cityOverallBarChart_Foreclosure);
    cityRaceSvg_Foreclosure.attr("width", chartWidth + margin.left + margin.right);
    cityRaceBarChart_Foreclosure.width(chartWidth);
    cityRaceSvg_Foreclosure.call(cityRaceBarChart_Foreclosure);

    cityOverallSvg_NetWorth.attr("width", chartWidth + margin.left + margin.right);
    cityOverallBarChart_NetWorth.width(chartWidth);
    cityOverallSvg_NetWorth.call(cityOverallBarChart_NetWorth);
    cityRaceSvg_NetWorth.attr("width", chartWidth + margin.left + margin.right);
    cityRaceBarChart_NetWorth.width(chartWidth);
    cityRaceSvg_NetWorth.call(cityRaceBarChart_NetWorth);
  });
});

function makeBarChart() {
  var width,
      height,
      margin,
      data,
      races,
      colors,
      xValue,
      domain,
      labelFormat,
      showAxis;

  function my(selection) {

    var x = d3.scaleLinear()
      .domain(domain)
      .range([0, width])

    var y = d3.scaleBand()
      .domain(races)
      .range([margin.top, height - margin.bottom])
      .paddingInner(0.35);

    var fill = d3.scaleOrdinal()
      .domain(races)
      .range(colors);

    if(showAxis) {
      var yAxis = selection.selectAll(".y.axis")
        .data([null]);
  
      yAxis.enter()   
        .append('g')
        .attr('class', 'y axis')
        .attr("transform", "translate(" + margin.left + ", 0)")
        .call(
          d3.axisLeft(y)
            .tickSize(0)
            .tickPadding(6)
        );
    }

    if(!showAxis) {
      selection.selectAll(".y.axis").remove();
    }

    selection.select(".y.axis .domain")
      .remove();

    var raceBars = selection.selectAll(".barGrp")
      .data(data, function(d) { return d.race; });

    raceBars.exit().remove();

    var raceBarsEnter = raceBars.enter()
      .append("g")
      .attr("class", "barGrp");

    raceBarsEnter.append("rect")
      .attr("class", "bar")
      .attr("x", margin.left)
      .attr("y", function(d) { return y(d.race); })
      .attr("width", function(d) { return isNaN(d[xValue]) ? 0 : x(d[xValue]); })
      .attr("height", y.bandwidth())
      .style("fill", function(d) { return fill(d.race); });

    raceBarsEnter.append("text")
      .attr("class", "label")
      .attr("x", function(d) { return isNaN(d[xValue]) ? margin.left + 5 : x(d[xValue]) + margin.left + 5; })
      .attr("y", function(d) { return y(d.race) + y.bandwidth(); })
      .attr("dy", "-0.5em")
      .text(function(d) { return isNaN(d[xValue]) ? "Not available" : labelFormat === "percent" ? PCTFORMAT(d[xValue]) : labelFormat === "percent_twodecimal" ? PCTFORMAT_TWODECIMAL(d[xValue]) : labelFormat === "dollar" ? DOLLARFORMAT(d[xValue]) : d[xValue]; }); 

    raceBarsEnter = raceBarsEnter.merge(raceBars);

    raceBarsEnter.select("rect")
      .transition()
      .attr("x", margin.left)
      .attr("width", function(d) { return isNaN(d[xValue]) ? 0 : x(d[xValue]); });
  
    raceBarsEnter.select("text")
      .transition()
      .attr("x", function(d) { return isNaN(d[xValue]) ? margin.left + 5 : x(d[xValue]) + margin.left + 5; })
      .text(function(d) { return isNaN(d[xValue]) ? "Not available" : labelFormat === "percent" ? PCTFORMAT(d[xValue]) : labelFormat === "percent_twodecimal" ? PCTFORMAT_TWODECIMAL(d[xValue]) : labelFormat === "dollar" ? DOLLARFORMAT(d[xValue]) : d[xValue]; });
  }

  my.width = function (_) {
    return arguments.length ? ((width = +_), my) : width;
  };

  my.height = function (_) {
    return arguments.length ? ((height = +_), my) : height;
  };

  my.margin = function (_) {
    return arguments.length ? ((margin = _), my) : margin;
  };

  my.data = function(_) {
    return arguments.length ? (data = _, my): data;
  }

  my.races = function (_) {
    return arguments.length ? ((races = _), my) : races;
  };

  my.colors = function (_) {
    return arguments.length ? ((colors = _), my) : colors;
  };

  my.xValue = function (_) {
    return arguments.length ? ((xValue = _), my) : xValue;
  };

  my.domain = function (_) {
    return arguments.length ? ((domain = _), my) : domain;
  };

  my.labelFormat = function (_) {
    return arguments.length ? ((labelFormat = _), my) : labelFormat;
  };

  my.showAxis = function (_) {
    return arguments.length ? ((showAxis = _), my) : showAxis;
  };

  return my;
}

function makeStripchart() {
  var width,
      height,
      margin,
      domain,
      data,
      tickFormat;

  function my(selection) {

    var x = d3.scaleLinear()
      .domain(domain)
      .range([0, width - margin.left - margin.right])
      .nice();

      var xAxis = selection.selectAll(".x.axis")
      .data([null]);

    xAxis.enter()   
      .append('g')
      .attr('class', 'x axis')
      .attr("transform", "translate(" + margin.left + ", " + (height - margin.bottom) / 2 + ")")
      .merge(xAxis)
      .transition()
      .call(
        d3.axisBottom(x)
          .ticks(5)
          .tickSize(11)
          .tickPadding(9)
          .tickFormat(tickFormat)
      );

    selection.select(".x.axis .domain")
      .remove();

    selection.selectAll(".x.axis .newDomainLine")
      .remove();

    xAxis.append("line")
        .attr("class", "newDomainLine")
        .attr("x1", 0)
        .attr("x2", width - margin.left - margin.right)
        .attr("y1", margin.top)
        .attr("y2", margin.top);

    var dots = selection.selectAll(".dot")
      .data(data, function(d) { return d.geo_level; });

    dots.exit().remove();

    dots.enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", function(d) { return isNaN(d.value) ? 0 : margin.left + x(d.value); })
      .attr("cy", (height - margin.bottom) / 2)
      .attr("r", 8)
      .style("fill", function(d) { return d.geo_level === "PUMA" ? "#fdbf11" : "#000"; })
      .style("opacity", function(d) { return isNaN(d.value) ? "0" : "1"; })
      .style("stroke", "#000")
      .style("stroke-width", 3)
      .merge(dots)
      .transition()
      .attr("cx", function(d) { return isNaN(d.value) ? 0 : margin.left + x(d.value); })
      .style("opacity", function(d) { return isNaN(d.value) ? "0" : "1"; });

    selection.selectAll(".dot")  // need to attach event handlers here for tooltip functionality to work on elements that can be updated (transitioned)
      .on("mouseover", pointermoved)
      .on("mouseout", pointerleft);

    var tooltip = selection.selectAll(".tooltip2")
      .data([null])   
      .enter()
      .append("g")
      .attr("class", "tooltip2")
      .style("pointer-events", "none")
      .style("visibility", "hidden");

    tooltip
      .append("polygon")
      .style("fill", "#9d9d9d");

    tooltip
      .append("text");

    function pointermoved(event) {
      var xpos = margin.left + x(event.value);

      tooltip = selection.selectAll(".tooltip2"); // not sure why I have to select this again
      var triangleSize = 18;
      var trianglePoints = "0," + (triangleSize - height + 15) + " " + (-0.5 * triangleSize) + "," + (-triangleSize) + " " + (0.5 * triangleSize) + "," + (-triangleSize);

      tooltip
        .select("polygon")
        .attr("points", trianglePoints);

      var tooltipText = event.geo_level.charAt(0).toUpperCase() + event.geo_level.slice(1) + ": " + (tickFormat !== null ? tickFormat(event.value) : event.value);
      var textAlignment = "middle";
      if(xpos < 70) {
        textAlignment = "start";
      }
      if(xpos > width) {
        textAlignment = "end";
      }

      tooltip
        .select("text")
        .text(tooltipText)
        .style("text-anchor", textAlignment);

      tooltip
        .attr("transform", "translate(" + xpos + ", " + height + ")")
        .style("visibility", "visible");
    }
  
    function pointerleft() {
      tooltip.style("visibility", "hidden");
    }
  }

  my.width = function (_) {
    return arguments.length ? ((width = +_), my) : width;
  };

  my.height = function (_) {
    return arguments.length ? ((height = +_), my) : height;
  };

  my.margin = function (_) {
    return arguments.length ? ((margin = _), my) : margin;
  };

  my.domain = function (_) {
    return arguments.length ? ((domain = _), my) : domain;
  };

  my.data = function(_) {
    return arguments.length ? (data = _, my) : data;
  };

  my.tickFormat = function(_) {
    return arguments.length ? (tickFormat = _, my): tickFormat;
  }

  return my;
}

function makeLegend() {
  var width,
      height,
      margin,
      labels,
      labelFormat;

  function my(selection) {

    var colors = ["#A2D4EC", "#73BFE2", "#1696D2", "#12719E", "#0A4C6A"];
    var blockWidth = (width - margin.left - margin.right) / colors.length;
    var blockHeight = 18;

    var blocks = selection.selectAll(".legendBlock")
      .data([0, 1, 2, 3, 4]);

    blocks.enter()
      .append("rect")
      .attr("class", "legendBlock")
      .attr("y", margin.top)
      .attr("height", blockHeight)
      .style("fill", function(d) { return colors[d]; })
      .merge(blocks)
      .transition()
      .attr("x", function(d) { return margin.left + (blockWidth * d); })
      .attr("width", blockWidth);

    var labelText = selection.selectAll(".legendLabel")
      .data(labels);

    labelText.exit().remove();

    labelText.enter()
      .append("text")
      .attr("class", "legendLabel")
      .attr("y", margin.top + blockHeight + 15)
      .attr("dy", "0.35em")
      .text(function(d) { return labelFormat ? labelFormat(d) : d; })
      .merge(labelText)
      .transition()
      .attr("x", function(d, i) { return margin.left + (blockWidth * i); })
      .text(function(d) { return labelFormat ? labelFormat(d) : d; });
  }

  my.width = function (_) {
    return arguments.length ? ((width = +_), my) : width;
  };

  my.height = function (_) {
    return arguments.length ? ((height = +_), my) : height;
  };

  my.margin = function (_) {
    return arguments.length ? ((margin = _), my) : margin;
  };

  my.labels = function(_) {
    return arguments.length ? (labels = _, my) : labels;
  };

  my.labelFormat = function(_) {
    return arguments.length ? (labelFormat = _, my): labelFormat;
  }

  return my;
}

function initMap(puma_city_state_mapping){

  mapboxgl.accessToken = 'pk.eyJ1IjoidXJiYW5pbnN0aXR1dGUiLCJhIjoiTEJUbmNDcyJ9.mbuZTy4hI_PWXw3C3UFbDQ';

  map = new mapboxgl.Map({
    attributionControl: false,
    container: 'map',
    style: 'mapbox://styles/urbaninstitute/cl3dsnvc0000215mtxuo8rwwi',
    center: [-93.512, 39.264],
    zoom: 3.5,
    maxZoom: 11,
    minZoom: 3.5
  });

  var hoverGeoID = null; // track which geo is mousedover

  map.on('load', function() {
    // make the tract outlines in the *-hover-borders layer transparent initially
    // as geos are hovered over, that geo's border's opacity will be set to 1
    map.setPaintProperty(
      'puma-hover-strokes',
      'line-opacity',
      [
        'case',
        ['boolean', ['feature-state', 'highlight'], false],
        1,
        0
      ]
    );

    // also make city boundaries transparent initially
    // when a city is searched, the boundary for that city will be turned on
    map.setPaintProperty(
      'cities boundaries',
      'line-opacity',
      [
        'case',
        ['boolean', ['feature-state', 'highlight'], false],
        1,
        0
      ]
    );

    // disable map rotation using right click + drag
    map.dragRotate.disable();

    // disable map rotation using touch rotation gesture
    map.touchZoomRotate.disableRotation();

    // disable map zoom when using scroll
    map.scrollZoom.disable();

    // Create a popup, but don't add it to the map yet.
    var popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    // is entering from a PUMA-specific URL, make sure to outline that PUMA on the map
    if(pumaSpecificUrl) {
      map.setFeatureState({
        source: 'composite',
        sourceLayer: 'pumasid',
        id: clickedGeoID
      },
      {
        highlight: true
      });
    }

    // hover behavior adapted from: https://docs.mapbox.com/help/tutorials/create-interactive-hover-effects-with-mapbox-gl-js/
    // also a good resource: https://blog.mapbox.com/going-live-with-electoral-maps-a-guide-to-feature-state-b520e91a22d
    map.on('mousemove', 'puma-hover-fill', function(e) { // detect mousemove on the fill layer instead of stroke layer so correct geo is highlighted. I created a fill layer with opacity of 0 so we don't have to repeat this code for each of the 10 layers that show the different metrics
      map.getCanvas().style.cursor = 'pointer';

      // Check whether features exist
      if (e.features.length > 0) {

        // If geoID for the hovered feature is not null,
        // use removeFeatureState to reset to the default behavior
        if (hoverGeoID) {
          map.removeFeatureState({
            source: 'composite',  // can find what the source and sourceLayer are from console logging e.features[0]["layer"]
            sourceLayer: 'pumasid',
            id: hoverGeoID
          });
        }

        hoverGeoID = e.features[0]["id"]; // this is the Mapbox numeric id
        // console.log(hoverGeoID);

        // When the mouse moves over the tract-hover-strokes layer, update the
        // feature state for the feature under the mouse
        map.setFeatureState({
          source: 'composite',
          sourceLayer: 'pumasid',
          id: hoverGeoID
        },
        {
          highlight: true
        });

        // also display a tooltip with the PUMA name
        popup
          .setLngLat(e.lngLat)
          .setHTML(e.features[0].properties.puma10_name)
          .addTo(map);

        dispatch.call("mapMouseover", this, hoverGeoID);

        // if a geo has been clicked on, make sure it is still highlighted
        if(clickedGeoID) {
          map.setFeatureState({
            source: 'composite',
            sourceLayer: 'pumasid',
            id: clickedGeoID
          }, {
            highlight: true
          });
        }
      }
    });

    map.on("mouseleave", "puma-hover-fill", function() {

      if (hoverGeoID) {
        map.setFeatureState({
          source: 'composite',
          sourceLayer: 'pumasid',
          id: hoverGeoID
        }, {
          highlight: false
        });
      }

      hoverGeoID = null;

      // if a geo has been clicked on, keep it highlighted
      if(clickedGeoID) {
        map.setFeatureState({
          source: 'composite',
          sourceLayer: 'pumasid',
          id: clickedGeoID
        }, {
          highlight: true
        });
      }

      popup.remove();

      dispatch.call("mapMouseout", this, clickedGeoID);

      // Reset the cursor style
      map.getCanvas().style.cursor = '';
    });

    map.on("click", "puma-hover-fill", function(e) {

      if(e.features.length > 0) {
        // stop highlighting any previously clicked on tracts
        if (clickedGeoID) {
          map.removeFeatureState({
            source: 'composite',
            sourceLayer: 'pumasid',
            id: clickedGeoID
          });
        }

        clickedGeoID = e.features[0].id;
        selectedPumaId = clickedGeoID;
        selectedPuma = e.features[0].properties.puma10_name;
        selectedState = puma_city_state_mapping.filter(function(d) { return +d.puma_id === clickedGeoID; })[0].state_name;

        map.setFeatureState({
          source: 'composite',
          sourceLayer: 'pumasid',
          id: clickedGeoID
        },
        {
          highlight: true
        });

        var zipcodeSearch = false;
        dispatch.call("pumaSelected", this, clickedGeoID, selectedPuma, zipcodeSearch);

        // also update URL
        updateQueryString("?puma_id=" + clickedGeoID);
      }

      // clear any city boundaries
      map.removeFeatureState({
        source: 'composite',
        sourceLayer: 'citiesid'
      });
    });
  });

  map.addControl(new mapboxgl.NavigationControl({"showCompass": false}), "bottom-right");
}

function zoomIn(bounds) {
  map.fitBounds(
    bounds,
    {
      "padding": 20,
      "duration": 900,
      "essential": true, // If true, then the animation is considered essential and will not be affected by prefers-reduced-motion .
    }
  );
}

function parseQueryString(query) {
  var obj = {},
      qPos = query.indexOf("?"),
  tokens = query.substr(qPos + 1).split('&'),
  i = tokens.length - 1;
  if (qPos !== -1 || query.indexOf("=") !== -1) {
      for (; i >= 0; i--) {
          var s = tokens[i].split('=');
          obj[unescape(s[0])] = s.hasOwnProperty(1) ? unescape(s[1]) : null;
      };
  }
  return obj;
}

function updateQueryString(queryString){
  if (history.pushState) {
      var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + queryString;
      window.history.pushState({path:newurl},'',newurl);
  }
}

// initialize dropdown
$( function() {
  $( "#metric-select" ).selectmenu({
      change: function( event, data ) {
          dispatch.call("metricChange", this, data.item.value);
          selectedMetric = data.item.value;
      }
  });
});


//////////////////////// EVENT LISTENERS ////////////////////////////////////////
d3.select(".clearSelection")
  .on("click", function() { dispatch.call("clearSelection", this);
                            d3.select(".dashboard").classed("inactive", true);
                          });

d3.select(".modal button.close")
  .on("click", function() { d3.select(".modal").classed("closed", true); 
                            d3.select("body").classed("modalOpen", false);  
  });
d3.select(".openModalBtn")
  .on("click", function() { d3.select(".modal").classed("closed", false); 
                            d3.select("body").classed("modalOpen", true);
  });

d3.select(".searchResults .highlight")
  .on("click", function() { d3.select(".modal").classed("closed", false); 
                            d3.select("body").classed("modalOpen", true);
  });

d3.select("#locationSearch")
  .on("click", function() { $("#locationSearch").val(""); 
                            d3.select(".searchbox input").style("background-image", "url(./img/magnifyingGlass.svg");
  });

d3.select("button.dailyFinances").on("click", function() { switchTabs("dailyFinances");
                                                           switchActiveTabBtn("dailyFinances");
});

d3.select("button.economicResilience").on("click", function() { switchTabs("economicResilience");
                                                           switchActiveTabBtn("economicResilience");
});

d3.select("button.upwardMobility").on("click", function() { switchTabs("upwardMobility");
                                                           switchActiveTabBtn("upwardMobility");
});

d3.select(".modal")
  .on("click", function() { d3.select(".modal").classed("closed", true);
                            d3.select("body").classed("modalOpen", false)
 });

d3.select(".modalContent")
  .on("click", function() { d3.event.stopPropagation(); });

function switchTabs(tabName) {
  d3.selectAll(".tabContent").classed("hidden", true);
  d3.select(".tabContent." + tabName).classed("hidden", false);
}

function switchActiveTabBtn(tabName) {
  d3.selectAll(".tabWrapper button").classed("active", false);
  d3.selectAll(".tabWrapper button." + tabName).classed("active", true);
}

// scroll trigger to show/hide the "Return to top" button
// code adapted from: https://www.javascripttutorial.net/dom/css/check-if-an-element-is-visible-in-the-viewport/
document.addEventListener('scroll', function () {
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const populationRaceEthnicitySection = document.querySelector('.populationRaceEthnicity');
  const sectionTop = populationRaceEthnicitySection.getBoundingClientRect().top;

  if(sectionTop <= windowHeight) {
    // show button if user is at or below the Population by race and ethnicity section
    d3.select(".returnToMapBtn").classed("invisible", false);
  }
  else {
    d3.select(".returnToMapBtn").classed("invisible", true);
  }
}, {
  passive: true
});


window.addEventListener("resize", redraw);

function redraw() {
  screenWidth = window.innerWidth || document.documentElement.clientWidth;
  dispatch.call("resize", this, screenWidth);
}
