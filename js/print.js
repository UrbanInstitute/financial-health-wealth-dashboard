var selectedPuma = "",
    selectedPumaId = null,
    selectedState = "";

var COMMAFORMAT = d3.format(",.1f");
var PCTFORMAT = d3.format(".0%");
var PCTFORMAT_TWODECIMAL = d3.format(".2%");
var DOLLARFORMAT = d3.format("$,.0f");
var DOLLARFORMAT_SHORT = function(d) { return "$" + d3.format(".2s")(d); };

var dispatch = d3.dispatch("load");

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
  .defer(d3.csv, "data/puma_city_state_mapping.csv")
  .await(function(error, racial_comp_data, metrics_all, puma_city_state_mapping) {

    if(error) throw error;

    racial_comp_data.forEach(function(d) {
      d.share = +d.share
    });

    metrics_all.forEach(function(d) {
      d.value = +d.value
    });

    // parse PUMA to load print view with from query string
    var params = parseQueryString(window.location.search);

    selectedPumaId = params.puma_id;
    selectedPuma = puma_city_state_mapping.filter(function(d) { return d.puma_id === selectedPumaId; })[0].puma_name;
    selectedState = puma_city_state_mapping.filter(function(d) { return d.puma_id === selectedPumaId; })[0].state_name;

    dispatch.call("load", this, racial_comp_data, metrics_all, puma_city_state_mapping);
});

dispatch.on("load.map", function(racial_comp_data, metrics_all, puma_city_state_mapping) {
    d3.select(".searchResults .geoName").text(selectedPuma);
});

dispatch.on("load.racialCompositionCharts", function(racial_comp_data, metrics_all, puma_city_state_mapping) {

  // set chart params
  var width = 100, // set max width of bar
      height = 100,
      margin = {top: 0, right: 65, bottom: 0, left: 60}
      margin_noaxis = {top: 0, right: 65, bottom: 0, left: 0};

  var nationalData = racial_comp_data.filter(function(d) { return d.geo_name === "USA"});

  var races = nationalData.map(function(d) { return d.race; });
  var colors = ['#1696D2', '#FDBF11', '#55B748', '#EC008B'];

  var nationalSvg = d3.select(".populationRaceEthnicity .chart.national")
    .append("svg")
    .attr("width", width + margin.right)
    .attr("height", height);

  var nationalBarChart = makeBarChart()
    .width(width)
    .height(height)
    .margin(margin_noaxis)
    .data(nationalData)
    .races(races)
    .colors(colors)
    .xValue("share")
    .domain([0, 1])
    .labelFormat("percent")
    .showAxis(false);

  nationalSvg.call(nationalBarChart);

  var stateData = racial_comp_data.filter(function(d) { return d.geo_name === selectedState;});

  var stateSvg = d3.select(".populationRaceEthnicity .chart.state")
    .append("svg")
    .attr("width", width + margin.right)
    .attr("height", height);

  var stateBarChart = makeBarChart()
    .width(width)
    .height(height)
    .margin(margin_noaxis)
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
    .showAxis(true);

  pumaSvg.call(pumaBarChart);
});

dispatch.on("load.dashboard", function(racial_comp_data, metrics_all, puma_city_state_mapping) {
    d3.select(".dashboard .pumaName").text(selectedPuma);

  // set chart params
  var width = 350,
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
      .paddingInner(0.2);

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
          // .tickSize(0)
          .tickPadding(6)
          .tickFormat(tickFormat)
      );

    selection.select(".x.axis .domain")
      .remove();

    selection.select(".x.axis .newDomainLine")
      .remove();

    selection.append("line")
        .attr("class", "newDomainLine")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", (height - margin.bottom) / 2)
        .attr("y2", (height - margin.bottom) / 2)
        .style("stroke", "#000");

    var dots = selection.selectAll(".dot")
      .data(data, function(d) { return d.geo_level; });

    dots.exit().remove();

    dots.enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", function(d) { return isNaN(d.value) ? 0 : margin.left + x(d.value); })
      .attr("cy", (height - margin.bottom) / 2)
      .attr("r", 4)
      .style("fill", function(d) { return d.geo_level === "PUMA" ? "#fdbf11" : "#000"; })
      .style("opacity", function(d) { return isNaN(d.value) ? "0" : "1"; })
      .style("stroke", "#000")
      .style("stroke-width", 2)
      .merge(dots)
      .transition()
      .attr("cx", function(d) { return isNaN(d.value) ? 0 : margin.left + x(d.value); })
      .style("opacity", function(d) { return isNaN(d.value) ? "0" : "1"; });
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
