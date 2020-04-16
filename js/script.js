window.onload = main;

function main() {
    var width = window.innerWidth,
        height = window.innerHeight;

    var svg = d3.select("svg");

    var projection = d3
        .geoMercator()
        .center([121.5654, 25.085]) // 中心點(經緯度)
        .scale(width * 90) // 放大倍率
        .translate([width / 3, height / 2]) // 置中
        .precision(0.1);
    var path = d3.geoPath().projection(projection);

    const zoom = d3.zoom().scaleExtent([0.6, 10]).on("zoom", zoomed);
    svg.call(zoom);

    function zoomed() {
        svg.selectAll("path") // To prevent stroke width from scaling
            .attr("transform", d3.event.transform);
    }

    // Data and color scale
    var colorScale = d3
        .scaleThreshold()
        .domain([100, 200, 400, 700, 1000, 1500, 2000])
        .range(d3.schemeBlues[7]);

    var files = ["data/TOWN_MOI_1090324.json", "data/2020-04-11_21-29-13.json"];

    Promise.all(files.map((url) => d3.json(url))).then(function (values) {
        // Load Data
        ubike_data = values[1];

        function sumup(arr, key) {
            total = 0;
            for (var i = 0; i < arr.length; ++i) {
                total += parseInt(arr[i][key]);
            }
            return total;
        }

        var area_data = {};

        for (let key in ubike_data) {
            area = ubike_data[key]["sarea"];
            if (area in area_data) {
                area_data[area].push(ubike_data[key]);
            } else {
                area_data[area] = [];
            }
        }

        for (let key in area_data) {
            area_data[key]["total"] = {};
            area_data[key]["total"]["tot"] = sumup(area_data[key], "tot");
            area_data[key]["total"]["sbi"] = sumup(area_data[key], "sbi");
            area_data[key]["total"]["bemp"] = sumup(area_data[key], "bemp");
        }

        // Draw Map
        taiwan = values[0];

        taipei_features = topojson
            .feature(taiwan, taiwan.objects.TOWN_MOI_1090324)
            .features.filter(function (data) {
                // console.log(data.properties.COUNTYNAME);
                return data.properties.COUNTYNAME == "臺北市";
            });

        non_taipei_features = topojson
            .feature(taiwan, taiwan.objects.TOWN_MOI_1090324)
            .features.filter(function (data) {
                // console.log(data.properties.COUNTYNAME);
                return data.properties.COUNTYNAME != "臺北市";
            });

        // Draw Taipei City
        svg.selectAll("path")
            .data(taipei_features)
            .enter()
            .append("path")
            .attr("class", "taipei")
            .attr("d", path)
            .attr("fill", function (data) {
                // data.total = area_data.get(data.TOWNNAME) || 0;
                console.log(
                    data.properties.TOWNNAME,
                    area_data[data.properties.TOWNNAME]["total"]["bemp"]
                );
                return colorScale(
                    area_data[data.properties.TOWNNAME]["total"]["bemp"]
                );
            })
            .attr("id", (data) => {
                return "city" + data.properties.TOWNID;
            })
            .on("click", (data) => {
                document.querySelector(".info .content").innerHTML =
                    data.properties.TOWNNAME;
            });

        // Draw Towns that is not Taipei
        svg.selectAll("path")
            .data(non_taipei_features)
            .enter()
            .append("path")
            .attr("class", "non-taipei")
            .attr("d", path);

        // Draw Boundary
        svg.append("path")
            .datum(
                topojson.mesh(
                    taiwan,
                    taiwan.objects.TOWN_MOI_1090324
                    // function (a, b) {
                    //     return (
                    //         a.properties.COUNTYNAME == "臺北市" ||
                    //         b.properties.COUNTYNAME == "臺北市"
                    //     );
                    // }
                )
            )
            .attr("d", path)
            .attr("class", "boundary");
    });
}
