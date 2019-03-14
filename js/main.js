var selectedDays = [];
var globalPlotDataRepo = [];
var dataForDaysSelected = [];
var totalHrs = 0;
var isPieReset = false;
const tooltip = d3.select("body").append("div").attr("class", "toolTip");
// will be used to convert date string from csv to date format
const parseDate =  d3.timeParse("%Y-%m-%d");
// will be used to convert date to string representing the date 
const formatDate = d3.timeFormat("%Y-%m-%d");

const  productive_cat = ['Reference & Learning', 'Software Development', 'Utilities', 
    'Business', 'Communication & Scheduling', 'Design & Composition'];
const distracted_cat = ['Entertainment', 'Social Networking', 'Shopping', 'News & Opinion'];
const neutral_cat = ['Uncategorized'];

// capture the browser window height and width
const window_Height = $(window).height(),
    window_Width = $(window).width();

// here we are calculating how much space each plot will take 
const leftPart_w = +(window_Width * 0.58), // left plots width
    rightPart_w = +(window_Width * 0.38),  // right plots width
    multiLineChart_h = +(window_Height * 0.42), // multiline chart height
    lineChart_h = +(window_Height * 0.28), // line chart height
    pie_h = +(window_Height * 0.29), // pie chart height
    bar_h = +(window_Height * 0.20); // bar chart height each

// used by data filters
var start_hour = 0,
    end_hour = 23,
    start_date = "",
    end_date = "";

var daysSelector = undefined;
// just to initialise Selectize functionality
$(function(){
    daysSelector = $("select").selectize({
        items : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], // add entries for days
        create : false, // user won't be able to add new day or delete 
        placeholder : "Select day(s)",
        onChange : function(value){
            selectedDays = value;
            filter_days = true;
            updateGraphs();
        }
    })
});

// used to load data from the default csv file 
// async call 
function readFromCsv(){
    d3.csv("data_rescuetime.csv", function(d) {
        return {
            date    : d.date, // not parsing date here  
            weekday : d.weekday,
            hour    : +d.hour, // converting to number format
            activity: d.activity,
            category: d.category,
            detailedCategory : d.detailedCat,
            productivityType : d.productivity_type,
            duration : +d.duration // converting to number format
        }
    }).then(function(data) {
        globalPlotDataRepo = data; // once we have data then load it in global variable 
        // console.log(data);
        plotGraphs(); // let's plot charts 
        setTimeout(function(){
            startIntroduction(); // wait for all charts to be loaded then show introduction
        }, 1000);
        
    });

}

// start - pie chart section 
var piechartChildData = [];

function getData_productivityType(input_data){
    var data= d3.nest()
        .key(function(d) { return d.productivityType; }) // grouping by productivity 
        .sortKeys(d3.ascending)
        .rollup(function(d) {
            return d3.sum(d, function(g) { return +g.duration; })
        })
        .entries(input_data);
    //console.log(data);
    return data;
}

function plot_pie(data, parentData){
    // this will link current pie data to data shown in bar when legend is clicked
    piechartChildData["activity"] = getData_productivityType_activity(parentData);
    piechartChildData["category"] = getData_productivityType_category(parentData); 

    const pieWidth = rightPart_w,
        pieHeight = pie_h,
        pieRadius = +(Math.min(pieWidth, pieHeight) / 2 ) + 40;

    const pie = d3.pie()
        .value(function(d) { return d.value; });

    // this is to show the actual pie 
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(pieRadius * 0.5); 

    // this is for the labels around each slice
    const secondArc = d3.arc()
        .innerRadius(pieRadius * 0.5)
        .outerRadius(pieRadius * 0.8);

    const pieColor = d3.scaleOrdinal()
        .domain(["Productive", "Distracted", "Neutral"])
        .range(["#323996", "#a50026", "#d9efee"]);

    // to calculate the angle of movement for pie slices 
    function arcTween(a){
        const i = d3.interpolate(this._current, a);
        this._current = i(1);
        return (t) => arc(i[t]); 
    }

    // initialize the pie svg
    const parentPie = d3.select("#parentPie")
        .append("svg")
            .attr("width", pieWidth)
            .attr("height", pieHeight)
        .append("g")
            .attr("transform", "translate(" + pieWidth / 2 + "," + pieHeight / 2 + ")");

    // add pie slices
    const path = parentPie.selectAll("path")
        .data(pie(data));

    path.transition().duration(15000).attrTween("d", arcTween); // the animation for movement
    
    path.enter().append("path")
        .attr("class" , (d) => "path_pie_"+ (d.data.key)) // this class will decide the pie color
        .attr("d", arc)
        .attr("stroke-width", "2px")
        .each( (d) => { this._current = d; });
    
    path.exit().remove(); // never used as we have same number of pie slices 

    // used for calculating label position angle
    function midAngle(d) {
        return d.startAngle + (d.endAngle - d.startAngle) / 2;
    }

    // create label texts 
    const text = parentPie.selectAll("text")
		.data(pie(data), (d) => { return d.data.key; } );

	text.enter()
		.append("text")
        .attr("dy", ".35em")
        .attr("transform", function(d) {
            var pos = secondArc.centroid(d);
            pos[0] = pieRadius * (midAngle(d) < Math.PI ? 1 : -1);
            return  "translate("+ pos +")";
        }) 
        .attr("text-anchor", (d) => {
                return (midAngle(d)) < Math.PI ? 'start' : 'end';
        })
		.text(function(d) {
			return (d.value / 3600).toFixed(0) + " Hours";
        });

    text.exit().remove();

    // the connectors 
    var polyline = parentPie.selectAll("polyline")
        .data(pie(data), (d) => {return d.data.key})
        .enter()
        .append("polyline")
        .attr("points", function(d) {
        var pos = secondArc.centroid(d);
            pos[0] = pieRadius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
            
        return [arc.centroid(d), secondArc.centroid(d), pos];
        })
        .style("fill", "none")
        .style("stroke", "black")
        .style("stroke-width", "1px");

    // legends 
    const legend = parentPie
        .attr("text-anchor", "end")
        .selectAll("g")
        .data(pie(data), (d) => { return d.data.key; } )
        .join("g")
            .attr("transform", (d, i) => `translate(${pieRadius + 80},${(i * 22) - 70})`)
            .attr("class", "legends");

    // color rect in legend
    legend.append("rect")
        .attr("x", -19)
        .attr("width", 19)
        .attr("height", 19)
        .attr("class", (d) => "rect_"+ d.data.key)
        .on("click", (d) => {     
            update_barCharts(d.data.key);
	    isPieReset = true;
        });

    // text in legend
    legend.append("text")
        .attr("x", -24)
        .attr("y", 9.5)
        .attr("font-family", "sans-serif")
        .attr("font-size", 14)
        .attr("font-weight", "bold")
        .attr("dy", "0.35em")
        .text(d => d.data.key);
}
// end - pie chart section

// start - bar chart section
const w_bar= rightPart_w , h_bar = bar_h;
const margin_bar = {
        top: 20, 
        right: 10, 
        bottom: 30, 
        left: 10
    },
    width_bar = w_bar - margin_bar.left - margin_bar.right,
    height_bar = h_bar - margin_bar.top - margin_bar.bottom;

const barColor = d3.scaleOrdinal()
    .domain([0,1,2,3,4])
    .range(["#ffffd4", "#fed98e", "#fe9929", "#d95f0e", "#993404"]);
    //.range(["#99BBD9", "#6493BD", "#507DA4", "#396285", "#284C6B"]);
var labelWidth = 0;

function getData_topCategories(input_data){
    var data = d3.nest()
        .key(function(d) { return d.category; }) // group by category
        .rollup(function(d) {
            return  d3.sum(d, function(g) { return +g.duration; })
        })
        .entries(input_data);
    data.sort(function(a, b) { return b.value - a.value});    // sort desc
    data = data.splice(0, 5); // take top 5
    data.sort(function(a, b) { return a.value - b.value}); // sort asc because we want smaller bar at the bottom  
    data.forEach(function(elem){
        var secs = elem.value;
        elem.value = (secs / 3600).toFixed(2); //~ hour values
    });
    // console.log(data);
    return data;
}

function getData_topActivities(input_data){
    var data = d3.nest()
        .key(function(d) { return d.activity; }) // 
        .rollup(function(d) {
            return d3.sum(d, function(g) { return +g.duration; })
        })
        .entries(input_data);

    data.sort(function(a, b) { return b.value - a.value });
    data = data.splice(0, 5);
    data.sort(function(a, b) { return a.value - b.value });
    data.forEach(function(elem){
        var secs = elem.value;
        elem.value = (secs / 3600).toFixed(2); //~ values 
    });
    // console.log(data);
    return data;
}
    
function getData_productivityType_category(input_data){
    var data = d3.nest()
        .key(function(d) { return d.productivityType; }) // parent group by productivity
        .sortKeys(d3.ascending)
        .key(function(d) { return d.category; }) // child group by category
        .rollup(function(d) {
            return d3.sum(d, function(g) { return +g.duration; })
        })
        .entries(input_data);

    data.forEach(element => {
        element.values.sort(function(a, b) { return b.value-a.value; });
        element.values = element.values.splice(0, 5);
        element.values.forEach((el) => {
            el.value = (el.value / 3600).toFixed(2); //~ value
        });
        element.values.sort(function(a, b) { return a.value - b.value });
    });
    // console.log(data);
    return data;
}

function getData_productivityType_activity(input_data){
    var data = d3.nest()
        .key(function(d) { return d.productivityType; }) // parent group by productivity
        .sortKeys(d3.ascending)
        .key(function(d) { return d.activity; }) // child group by activity
        .rollup(function(d) {
            return d3.sum(d, function(g) { return +g.duration; })
        })
        .entries(input_data);

    data.forEach(element => {
        element.values.sort(function(a, b) { return b.value-a.value; });
        element.values = element.values.splice(0, 5);
        element.values.forEach((el) => {
            el.value = (el.value / 3600).toFixed(2); //~ value
        });
        element.values.sort(function(a, b) { return a.value - b.value });
    });
    // console.log(data);
    return data;
}

function plot_categories_bar(data){
    var x_bar1 = d3.scaleLinear().range([0, width_bar]);
    var y_bar1 = d3.scaleBand().range([height_bar, 0]);
    
    // initialize bar svg
    const barChart_topCategory = d3.select("#topCategoryBar")
        .append("svg")
            .attr("width", w_bar)
            .attr("height", h_bar);
            
    var g = barChart_topCategory.append("g")
        .attr("transform", "translate(" + margin_bar.left + "," + margin_bar.top + ")");

        
    //calculate axis extents (min-max range)
    x_bar1.domain([0, d3.max(data, function(d) { return +d.value; })]); 
    y_bar1.domain(data.map(function(d) { return d.key; })).padding(0.1);
    
    // plot x axis
    g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height_bar + ")")
        .call(d3.axisBottom(x_bar1).tickSizeInner(-height_bar).tickSizeOuter(1));
    
    // x axis label
    g.append("text")
        .attr("class", "axis x label")
        .attr("text-anchor", "end")
        .attr("x", width_bar - 10)
        .attr("y", height_bar + 28)
        .text("hours");

    // plot bars 
    g.selectAll(".bar")
        .data(data)
        .enter().append("rect")
            .attr("class", "bar")
            .attr("fill", (d,i) => barColor(i))
            .attr("x", 0)
            .attr("height", y_bar1.bandwidth())
            .attr("y", function(d) { return y_bar1(d.key); })
            .attr("width", function(d) { return x_bar1(d.value); })
            .on("mousemove", function(d){
                tooltip
                    .style("left", d3.event.pageX - 50 + "px")
                    .style("top", d3.event.pageY - 70 + "px")
                    .style("display", "inline-block")
                    .html((d.key) + "<br> ~ " + d.value + " hours" );
            })
            .on("mouseout", function(d){ tooltip.style("display", "none");});

    g.selectAll(".text")  		
        .data(data)
        .enter().append("text")
            .attr("class","label")
            .attr("y", (function(d) { return y_bar1(d.key) + y_bar1.bandwidth() / 2 ; }))
            .attr("x", function(d) { return 4; })
            .attr("dy", ".35em")
            .text(function(d) { return d.key; })
            .each(function() {
                labelWidth = Math.ceil(Math.max(labelWidth, this.getBBox().width))
            });   	  
}

function plot_activities_bar(data){
    var x_bar2 = d3.scaleLinear().range([0, width_bar]);
    var y_bar2 = d3.scaleBand().range([height_bar, 0]);
    
    const barChart_topWebsites = d3.select("#topActivitiesBar")
        .append("svg")
            .attr("width", w_bar)
            .attr("height", h_bar);

    var g = barChart_topWebsites.append("g")
            .attr("transform", "translate(" + margin_bar.left + "," + margin_bar.top + ")");
        
    x_bar2.domain([0, d3.max(data, function(d) { return +d.value; })]);
    y_bar2.domain(data.map(function(d) { return d.key; })).padding(0.1);
    
    g.append("g")
        .attr("class", "x axis")
            .attr("transform", "translate(0," + height_bar + ")")
            .call(d3.axisBottom(x_bar2).tickSizeInner(-height_bar).tickSizeOuter(1));

    g.append("text")
        .attr("class", "axis x label")
        .attr("text-anchor", "end")
        .attr("x", width_bar - 10)
        .attr("y", height_bar + 28)
        .text("hours");
    
    g.selectAll(".bar")
        .data(data)
        .enter().append("rect")
            .attr("class", "bar")
            .attr("fill", (d,i) => barColor(i))
            .attr("x", 0)
            .attr("height", y_bar2.bandwidth())
            .attr("y", function(d) { return y_bar2(d.key); })
            .attr("width", function(d) { return x_bar2(d.value); })
            .on("mousemove", function(d){
                tooltip
                    .style("left", d3.event.pageX - 50 + "px")
                    .style("top", d3.event.pageY - 70 + "px")
                    .style("display", "inline-block")
                    .html((d.key) + "<br> ~" + d.value + " hours");
            })
            .on("mouseout", function(d){ tooltip.style("display", "none");});

    g.selectAll(".text")  		
        .data(data)
        .enter().append("text")
            .attr("class","label")
            .attr("y", (function(d) { return y_bar2(d.key) + y_bar2.bandwidth() / 2 ; }))
            .attr("x", function(d) { return 4; })
            .attr("dy", ".35em")
            .text(function(d) { return d.key; })
            .each(function() {
                labelWidth = Math.ceil(Math.max(labelWidth, this.getBBox().width))
            });   	  
}

function update_categories_bar(data){
    var x_bar1 = d3.scaleLinear().range([0, width_bar]);
    var y_bar1 = d3.scaleBand().range([height_bar, 0]);
    
    d3.select("#topCategoryBar").selectAll("*").remove();

    const barChart_topCategory = d3.select("#topCategoryBar")
        .append("svg")
            .attr("width", w_bar)
            .attr("height", h_bar);
            
    var g = barChart_topCategory.append("g")
        .attr("transform", "translate(" + margin_bar.left + "," + margin_bar.top + ")");

        
    x_bar1.domain([0, d3.max(data, function(d) { return +d.value; })]);
    y_bar1.domain(data.map(function(d) { return d.key; })).padding(0.1);
    
    g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height_bar + ")")
        .call(d3.axisBottom(x_bar1).tickSizeInner(-height_bar).tickSizeOuter(1));
    
    g.append("text")
        .attr("class", "axis x label")
        .attr("text-anchor", "end")
        .attr("x", width_bar - 10)
        .attr("y", height_bar + 28)
        .text("hours");

    g.selectAll(".bar")
        .data(data)
        .enter().append("rect")
            .attr("class", "bar")
            .attr("fill", (d,i) => barColor(i))
            .attr("x", 0)
            .attr("height", y_bar1.bandwidth())
            .attr("y", function(d) { return y_bar1(d.key); })
            .attr("width", function(d) { return x_bar1(d.value); })
            .on("mousemove", function(d){
                tooltip
                    .style("left", d3.event.pageX - 50 + "px")
                    .style("top", d3.event.pageY - 70 + "px")
                    .style("display", "inline-block")
                    .html((d.key) + "<br> ~ " + d.value + " hours" );
            })
            .on("mouseout", function(d){ tooltip.style("display", "none");});

    g.selectAll(".text")  		
        .data(data)
        .enter().append("text")
            .attr("class","label")
            .attr("y", (function(d) { return y_bar1(d.key) + y_bar1.bandwidth() / 2 ; }))
            .attr("x", function(d) { return 4; })
            .attr("dy", ".35em")
            .text(function(d) { return d.key; });
}

function update_activities_bar(data){
    var x_bar2 = d3.scaleLinear().range([0, width_bar]);
    var y_bar2 = d3.scaleBand().range([height_bar, 0]);
    
    d3.select("#topActivitiesBar").selectAll("*").remove();

    const barChart_topWebsites = d3.select("#topActivitiesBar")
        .append("svg")
            .attr("width", w_bar)
            .attr("height", h_bar);

    var g = barChart_topWebsites.append("g")
            .attr("transform", "translate(" + margin_bar.left + "," + margin_bar.top + ")");
        
    x_bar2.domain([0, d3.max(data, function(d) { return +d.value; })]);
    y_bar2.domain(data.map(function(d) { return d.key; })).padding(0.1);
    
    g.append("g")
        .attr("class", "x axis")
            .attr("transform", "translate(0," + height_bar + ")")
            .call(d3.axisBottom(x_bar2).tickSizeInner(-height_bar).tickSizeOuter(1));

    g.append("text")
        .attr("class", "axis x label")
        .attr("text-anchor", "end")
        .attr("x", width_bar - 10)
        .attr("y", height_bar + 28)
        .text("hours");
    
    g.selectAll(".bar")
        .data(data)
        .enter().append("rect")
            .attr("class", "bar")
            .attr("fill", (d,i) => barColor(i))
            .attr("x", 0)
            .attr("height", y_bar2.bandwidth())
            .attr("y", function(d) { return y_bar2(d.key); })
            .attr("width", function(d) { return x_bar2(d.value); })
            .on("mousemove", function(d){
                tooltip
                    .style("left", d3.event.pageX - 50 + "px")
                    .style("top", d3.event.pageY - 70 + "px")
                    .style("display", "inline-block")
                    .html((d.key) + "<br> ~" + d.value + " hours");
            })
            .on("mouseout", function(d){ tooltip.style("display", "none");});

    g.selectAll(".text")  		
        .data(data)
        .enter().append("text")
            .attr("class","label")
            .attr("y", (function(d) { return y_bar2(d.key) + y_bar2.bandwidth() / 2 ; }))
            .attr("x", function(d) { return 4; })
            .attr("dy", ".35em")
            .text(function(d) { return d.key; });
}

function update_barCharts(productivityType){
    var category_data = [],
        activity_data = [];
    // extract data for selected productivity
    piechartChildData["activity"].forEach(function(elem){
        if(elem.key === productivityType){
            activity_data = elem.values;
        } 
    });
    piechartChildData["category"].forEach(function(elem){
        if(elem.key === productivityType){
            category_data = elem.values;
        } 
    });
    // update bars 
    update_activities_bar(activity_data);
    update_categories_bar(category_data);
}
function resetBarCharts(){
    var newData = apply_hours_filter(apply_days_filter(apply_date_filter(globalPlotDataRepo)));
    update_activities_bar(getData_topActivities(newData));
    update_categories_bar(getData_topCategories(newData));
    isPieReset = false;
}
// end - bar chart section

// start - line chart section 
function calculate_productivity_score(data){
    var hourScore = [];
    data.forEach(function(element){
        var total =  Object.keys(element.values)
                .reduce(function(s,k) {
                    return s += element.values[k].value;
                }, 0);
        var productive = 0,
            neutral = 0;
        if(element.values != undefined){
            element.values.forEach(function(elem){
                if(elem.key === "Neutral"){
                    neutral = +elem.value;
                } else if(elem.key === "Productive"){
                    productive = +elem.value;
                }
            });
        } 
        var score = ( ((neutral * 0.5) + productive) / total);  // here we are calculating the productivity score
        hourScore.push({ key : element.key ,value : score});
    });
    // console.log(hourScore);
    return hourScore;
}

function getData_hour_productivity(input_data){
    var data = d3.nest()
        .key(function(d) { return +d.hour; }) // group by hour
        .sortKeys(function(a, b) {  return a-b; })
        .key(function(d) { return d.productivityType; }) // then productivity type
        .sortKeys(d3.ascending)
        .rollup(function(d) {
            return d3.sum(d, function(g) { return +g.duration; })
        })
        .entries(input_data); 
    // console.log(data);
    return data;
}

function plotlineChart(input_data) {
    var data = calculate_productivity_score(input_data);

    var margin = {
        top: 5,
        right: 15,
        bottom: +(lineChart_h * 0.29).toFixed(0),  // save enough space for 2nd chart for zoom
        left: 50
    },
    margin2 = {
        top: +(lineChart_h * 0.78).toFixed(0), // keep enough space from parents charts x axis
        right: 15,
        bottom: 20,
        left: 50
    },
    width = leftPart_w - margin.left - margin.right,
        height = lineChart_h - margin.top - margin.bottom,
        height2 = lineChart_h - margin2.top - margin2.bottom;

    // two axis per chart exact copies
    var x = d3.scaleLinear().domain(d3.extent(data, d => +d.key)).range([0, width]),
        x2 = d3.scaleLinear().domain(d3.extent(data, d => +d.key)).range([0, width]),
        y = d3.scaleLinear().domain(d3.extent(data, d => d.value)).range([height, 0]),
        y2 = d3.scaleLinear().domain(d3.extent(data, d => d.value)).range([height2, 0]);

    var xAxis = d3.axisBottom(x).tickSizeInner(-height).tickSizeOuter(1),
        xAxis2 = d3.axisBottom(x2),
        yAxis = d3.axisLeft(y).tickSizeInner(-width).tickSizeOuter(1);

    // the box we see when use to select range 
    var brush = d3.brushX()
        .extent([[0, 0], [width, height2]])
        .on("brush end", brushed);

    var zoom = d3.zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", zoomed);

    // the line that is showed in parent chart
    var area = d3.area()
        .x(function(d) { return x(d.key); })
        .y0(height)
        .y1(function(d) { return y(d.value); });
    
    // line that is showed in zoom chart
    var area2 = d3.area()
        .x(function(d) { return x2(d.key); })
        .y0(height2)
        .y1(function(d) { return y2(d.value); });

    //initializr svg
    var svg = d3.select("#hourProductiveScore")
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    var focus = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var context = svg.append("g")
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

    // plot line in parent chart
    focus.append("path")
        .datum(data)
        .attr("class", "path_avg")
        .attr("fill", "none")
        .attr("stroke", (d) => "#04034A") 
        .attr("d", area);
  
    focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
  
    focus.append("g")
        .attr("class", "y axis")
        .call(yAxis);
  
    //plot line in zoom chart
    context.append("path")
        .datum(data)
        .attr("class", "path_avg")
        .attr("fill", "none")
        .attr("stroke", (d) => "#04034A")
        .attr("d", area2);
  
    context.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2);
  
    context.append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, x.range());
  
    svg.append("rect")
        .attr("class", "zoom")
        .attr("width", width)
        .attr("height", height)
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .call(zoom);

    function brushed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; 
        var s = d3.event.selection || x2.range(); // here we are grabbing the selected range 
        var s_map = s.map(x2.invert, x2);
        x.domain(s_map);
        focus.select(".path_avg").attr("d", area);
        focus.select(".x.axis").call(xAxis);
        // this will zoom the parent chart
        svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
            .scale(width / (s[1] - s[0]))
            .translate(-s[0], 0));
        // convert to min and max values 
        var start_h = s_map[0].toFixed(0);
        var end_h = s_map[1].toFixed(0);
        if((start_hour != start_h) || (end_hour != end_h)){ // definatly selection has changed so update graphs
            start_hour = start_h;
            end_hour = end_h;
            // console.log(" selection changed -- " + start_hour + " to " + end_hour );
            filter_hour = true;
            updateGraphsForHours();
        }
    }
        
    function zoomed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;
        var t = d3.event.transform;
        var t_rescale = t.rescaleX(x2).domain();
        x.domain(t_rescale); 
        focus.select(".path_avg").attr("d", area);
        focus.select(".x.axis").call(xAxis);
        context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
        var start_h = t_rescale[0].toFixed(0);
        var end_h = t_rescale[1].toFixed(0);
        if((start_hour != start_h) || (end_hour != end_h)){
            start_hour = start_h;
            end_hour = end_h;
            // console.log(" selection changed -- " + start_hour + " to " + end_hour );
            filter_hour = true;
            updateGraphsForHours();
        }
    }
}
// end - line chart section 

// start - multiline chart section
function getData_productivity_percentage_by_date(input_data){
    var date_category_wiseDataRepo = d3.nest()
        .key(function(d) { return d.date; }) // group by date
        .sortKeys(d3.ascending)
        .key(function(d) { return d.productivityType; }) // then productivity type
        .sortKeys(d3.ascending)
        .rollup(function(d) {
            return d3.sum(d, function(g) { return +g.duration; })
        })
        .entries(input_data);

    var data = [];
    date_category_wiseDataRepo.forEach(function(element){
        var total =  Object.keys(element.values)
            .reduce(function(s,k) {
                return s += element.values[k].value;
            }, 0);  
        var distracted = 0,
            productive = 0,
            neutral = 0;
        
        if(element.values != undefined){
            element.values.forEach(function(elem){
                if(elem.key === "Neutral"){
                    neutral = +elem.value;
                } else if(elem.key === "Productive"){
                    productive = +elem.value;
                } else if(elem.key === "Distracted"){
                    distracted = +elem.value;
                }

            });
        } 

        // calculate percantages 
        data.push({ key : parseDate(element.key) ,
            "Distracted" : ((distracted/total * 100).toFixed(2)),
            "Neutral" : ((neutral/total * 100).toFixed(2)),
            "Productive" : ((productive/total * 100).toFixed(2))
        });
    });
    // console.log(data);
    return data;
}

function plotMultilineChart(data) {
    var margin = {
        top: 5,
        right: 15,
        bottom: +(multiLineChart_h * 0.28).toFixed(0), // save space for zoom chart
        left: 50
    },
    margin2 = {
        top: +(multiLineChart_h * 0.78).toFixed(0),
        right: 15,
        bottom: 20,
        left: 50
    },
    width = leftPart_w - margin.left - margin.right,
        height = multiLineChart_h - margin.top - margin.bottom,
        height2 = multiLineChart_h - margin2.top - margin2.bottom;

    var x = d3.scaleTime().range([0, width]),
        x2 = d3.scaleTime().range([0, width]),
        y = d3.scaleLinear().range([height, 0]),
        y2 = d3.scaleLinear().range([height2, 0]);

    var xAxis = d3.axisBottom(x).tickSizeInner(-height).tickSizeOuter(1),
        xAxis2 = d3.axisBottom(x2),
        yAxis = d3.axisLeft(y).tickSizeInner(-width).tickSizeOuter(1);

    var brush = d3.brushX()
        .extent([[0, 0], [width, height2]])
        .on("brush end", brushed);

    var zoom = d3.zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", zoomed);

    var area = function (color) {
        return d3.area()
            .x(function (d) {
            return x(d.key);
        })
            .y0(height)
            .y1(function (d) {
            return y(d[color]);
        });
    };

    var area2 = function (color) {
        return d3.area()
            .x(function (d) {
            return x2(d.key);
        })
            .y0(height2)
            .y1(function (d) {
            return y2(d[color]);
        });
    };

    var svg = d3.select("#multiLine")
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
            .attr("width", width)
            .attr("height", height);

    var focus = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var context = svg.append("g")
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

    x.domain(d3.extent(data.map(function (d) {
        return d.key;
    })));
    y.domain([0, 100]); // no matter what is smallest data we are going to show 0 to 100 %

    x2.domain(x.domain());
    y2.domain(y.domain());

    focus.selectAll('path')
        .data(['Distracted', 'Neutral', 'Productive'])
      .enter()
        .append('path')
        .attr('clip-path', 'url(#clip)')
        .attr('d', function (col) {
          return area(col)(data);
        })
        .attr('class', function (col) {
          return "path_" + col + " data";
        });  

    focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis.tickFormat(d3.timeFormat("%b %d")));

    focus.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    context.selectAll('path')
    .data(['Distracted', 'Neutral', 'Productive'])
      .enter()
        .append('path')
        .attr('d', function (col) {
          return area2(col)(data);
        })
        .attr('class', function (col) {
          return "path_" + col;
        });
    
    context.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2.tickFormat(d3.timeFormat("%b %d")));

    context.append("g")
        .attr("class", "x brush")
        .call(brush)
        .call(brush.move, x.range())
    
    svg.append("rect")
      .attr("class", "zoom")
      .attr("width", width)
      .attr("height", height)
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .call(zoom);

    function brushed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; 
        var s = d3.event.selection || x2.range();
        var s_map = s.map(x2.invert, x2);
        x.domain(s_map);
        focus.selectAll("path.data").attr("d", function (col) { return area(col)(data); });
        focus.select(".x.axis").call(xAxis);
        // convert to min and max dates 
        var start_d = formatDate(s_map[0]);
        var end_d = formatDate(s_map[1]);
        if((start_date !== start_d) || (end_date !== end_d)){
            start_date = start_d;
            end_date = end_d;
            // console.log("date range is changed to " + start_date + " to " + end_date);
            filter_date = true;
            updateGraphs();
        }
        
    }

    function zoomed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; 
        var t = d3.event.transform;
        var t_rescale = t.rescaleX(x2).domain();
        x.domain(t_rescale);
        focus.selectAll("path.data").attr("d", function (col) { return area(col)(data); });
        focus.select(".x.axis").call(xAxis);
        context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
        var start_d = formatDate(s_map[0]);
        var end_d = formatDate(s_map[1]);
        if((start_date !== start_d) || (end_date !== end_d)){
            start_date = start_d;
            end_date = end_d;
            // console.log("date range is changed to " + start_date + " to " + end_date);
            filter_date = true;
            updateGraphs();
        }
    }
}
// end - multiline chart section 

var filter_days = true,
    filter_date = false,
    filter_hour = false;

function apply_days_filter(input_data){
    var data = input_data;
    if(filter_days){
        // first days selected 
        if(selectedDays.length === 0){ 
            // this is first load sos let's include all days by default
            selectedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        }
    
        data = input_data.filter(function(d) {
            var idx = $.inArray(d.weekday, selectedDays);
            return ( idx != -1 ? true : false);
        });
        filter_days = false;
    }
    return data;
}

function apply_hours_filter(input_data){
    var data = input_data;
    // hours filter from line chart
    if(filter_hour){
        if((start_hour != undefined && start_hour >=0 )&& (end_hour != undefined && end_hour <=23)){
            data = input_data.filter(function(d){
                    return (start_hour <= +d.hour) && (+d.hour <= end_hour) ? true : false; 
                });
        }
        filter_hour = false;
    }
    return data;
}

function apply_date_filter(input_data){
    var data = input_data;
    // dates from multiline chart 
    if(filter_date) {
        if((start_date != "" || start_date != undefined) && (end_date != "" || end_date != undefined)){
            data = input_data.filter(function(d){
                    var start = parseDate(start_date),
                        end = parseDate(end_date)
                        curr = parseDate(d.date);
                    return (start <= curr) && (curr <= end) ? true : false;
                    
                })
        }
        filter_date = false;
    }
    return data;
}

function plotGraphs(){
    // no filters for this one 
    d3.select("#multiLine").selectAll("*").remove();
    plotMultilineChart(getData_productivity_percentage_by_date(globalPlotDataRepo));

    var data = apply_hours_filter(apply_days_filter(apply_date_filter(globalPlotDataRepo)));
    totalHrs = Object.keys(data)
        .reduce(function(s,k) {
            return s += data[k].duration;
            }, 0);

    d3.select("#parentPie").selectAll("*").remove();
    d3.select("#topCategoryBar").selectAll("*").remove();
    d3.select("#topActivitiesBar").selectAll("*").remove();
    d3.select("#hourProductiveScore").selectAll("*").remove();

    plot_pie(getData_productivityType(data), data);
    plot_activities_bar(getData_topActivities(data));
    plot_categories_bar(getData_topCategories(data));
    plotlineChart(getData_hour_productivity(data));
}

// used by multiline chart and days filter to update line chart, pie and bar charts 
function updateGraphs(){
    var data =  apply_days_filter(apply_date_filter(globalPlotDataRepo));

    totalHrs = Object.keys(data)
                .reduce(function(s,k) {
                       return s += data[k].duration;
                    }, 0);

    d3.select("#parentPie").selectAll("*").remove();
    plot_pie(getData_productivityType(data), data);

    d3.select("#topCategoryBar").selectAll("*").remove();
    plot_categories_bar(getData_topCategories(data));

    d3.select("#topActivitiesBar").selectAll("*").remove();
    plot_activities_bar(getData_topActivities(data));

    d3.select("#hourProductiveScore").selectAll("*").remove();
    plotlineChart(getData_hour_productivity(data));
}

// used by line chart zoom function to update pie and bar charts 
function updateGraphsForHours(){
    var data = apply_hours_filter(apply_days_filter(apply_date_filter(globalPlotDataRepo)));

    totalHrs = Object.keys(data)
                .reduce(function(s,k) {
                       return s += data[k].duration;
                    }, 0);

    d3.select("#parentPie").selectAll("*").remove();
    plot_pie(getData_productivityType(data), data);

    d3.select("#topCategoryBar").selectAll("*").remove();
    plot_categories_bar(getData_topCategories(data));

    d3.select("#topActivitiesBar").selectAll("*").remove();
    plot_activities_bar(getData_topActivities(data));   
}

// pie chart reset button
d3.select("#pie_reset")
.on("click", function(){
	if(isPieReset)
    	resetBarCharts();
});
// global reset button
d3.select("#global_reset")
.on("click", function(){
    daysSelector[0].selectize.setValue(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    selectedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    plotGraphs();
})

// actual call to start reading from csv file 
readFromCsv();

// will read data from selected csv file 
function fileUpload(t){
    var files = $('#upload')[0];
    var reader = new FileReader();

    const parseFullDate = d3.timeParse("%Y-%m-%d %H:%M:%S"), // date format in base csv from resuctime
    formatDay = d3.timeFormat("%A"), //weekdays 
    formatBackToDate = d3.timeFormat("%m-%d-%Y");

    reader.onload = function(e) {
        var d = e.target.result;
        // get rows 
        var rows = d.split('\n'); // d will hold all the rows in text format
        var entries = [];
        
        rows.forEach(r => {
            var columns = r.split(',');
            var date = columns[0].substring(0,10),  
                hour = columns[0].substring(11,13), 
                day = formatDay(parseFullDate(columns[0].substring(0, 19))),
                activity = columns[1];

            if(columns.length > 6){
                // there is , inside the column data 
                var detail = columns[2]; // we are not going to use this but it affects next columns s
                var i = 3;
                for( ; i < columns.length ; i++){
                    if( $.inArray(columns[i], productive_cat) === -1
                    && $.inArray(columns[i], distracted_cat) === -1
                    && $.inArray(columns[i], neutral_cat) === -1 ){
                        detail += columns[i];
                    } else {
                        break;
                    }
                }
                var category = columns[i++];
                var detailedCat = columns[i++];
                var duration = columns[i];
            } else {
                var detail = columns[2];
                var category = columns[3];
                var detailedCat = columns[4];
                var duration = columns[5];
            }
            entries.push({
                date : date,
                hour : hour,
                weekday : day,
                activity : activity,
                category : category,
                detailedCat : detailedCat,
                duration : duration
            });
        });
    
        entries.forEach(function(entry){
            var productivity_type = "";
            if(entry.activity === 'medium.com') { // the exception 
                productivity_type = "Productive";
            }else if($.inArray(entry.category, productive_cat) != -1) {
                productivity_type = "Productive";
            } else if($.inArray(entry.category, distracted_cat) != -1) {
                productivity_type = "Distracted";
            } else {
                productivity_type = "Neutral";
            }
            entry.productivityType = productivity_type;
    
        });
        // remove unwanted entries 
        entries = entries.filter(function(entry) {
            return (entry.activity === 'explorer') || (entry.activity === 'newtab') ? false : true;
        });
        // the last one is always default values object 
        entries.pop();
        //console.log(entries);
        globalPlotDataRepo = entries;
        plotGraphs();
    }
    reader.readAsText(files.files[0]);
}

// intro Js function as stated in example 
function startIntroduction(){
    var intro = introJs();
    intro.setOptions({
    steps: [
        { 
            intro: "Welcome to RescueTime Data Explorer".bold()+" <br> <br>"
            + "This dashboard will be presenting analytics of your laptop use and will allow you to have a clear view on your productivity levels.<br/>"
            + "This tutorial aims to explain the content of each plot, you can skip it at any moment by clicking on 'Skip'.<br/><br>" 
		
            + "Let's start !"
        },
        {
            element: document.querySelector('.step2'),
            intro: "This line chart plots your daily productivity percentage. <br>"
		+ "By using the slider below, you can choose a specific range of days to conduct your analysis and all the other plots will be updated accordingly. "
        },
        {
            element: document.querySelector('.step3'),
            intro: " In this plot, we have an average hourly score so that you can understand in which " 
            + "parts of the day you are usually the most productive.<br>" 
	    + "The formula used to calculate the hourly score is : 1*ratio_productive + 0.5*ratio_neutral <br>"
            + "Using the slider below, you can choose a range of hours to conduct your analysis and the plots on the right side will be updated accordingly.<br/>"
            
        },
        {
            element: document.querySelector('.step4'),
            intro: "This is a pie chart with the overall distribution of productivity over your activies. <br>"
		+"By using the filters on the right, you can choose to only focus on one of the levels and the bar charts below will get updated."
        },
        {
            element: document.querySelector('.step5'),
            intro: "5 most used activities during your logged time ",
        },
        {
            element: document.querySelector('.step6'),
            intro: "5 most used categories during your logged time"
        },
        {
            element: document.querySelector('.step7'),
            intro: "Here you can either remove or add a weekday (ex : if you want to remove the weekend from productivity analysis and focus on working days)"
        },
        {
            element: document.querySelector('.step8'),
            intro: " At last, if you want to play with your own data, click here. <br/>Enjoy the ride !"
        }
    ]
    });
    intro.start();
}
