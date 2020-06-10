window.onload = main;

function main() {
    var width = window.innerWidth,
        height = window.innerHeight;

    const voronoi_color = "#639a67";
    const voronoi_hover_color = "#639a67cc";
    const voronoi_border_color = "#333";
    const nontaipei_color = "#777";
    const boundaries_color = "#dddd";

    var svg = d3.select("svg");
    var container = svg.append("g");

    var projection = d3
        .geoMercator()
        .center([121.5654, 25.085]) // 中心點(經緯度)
        .scale(width * 90) // 放大倍率
        .translate([width / 3, height / 2]) // 置中
        .precision(0.1);
    var path = d3.geoPath().projection(projection);
    var voronoi = d3.voronoi().extent([
        [0, 0],
        [width, height],
    ]);

    const zoom = d3.zoom().scaleExtent([0.6, 100]).on("zoom", zoomed);
    svg.call(zoom);

    function zoomed() {
        svg.selectAll("g").attr("transform", d3.event.transform);
    }

    // Data and color scale
    var colorScale = d3
        .scaleThreshold()
        .domain([100, 200, 400, 700, 1000, 1500, 2000])
        .range(d3.schemeBlues[7]);

    // External Files
    var files = [
        "data/TOWN_MOI_1090324.json",
        "https://raw.githubusercontent.com/ycychsiao/tmp/master/Taipei_UBike_site.json",
        "https://tcgbusfs.blob.core.windows.net/blobyoubike/YouBikeTP.json",
    ];

    // Start from here!
    Promise.all(files.map((url) => d3.json(url))).then(function (values) {
        data = values[2];
        let sbi = [],
            sna = [];
        for (let key in data["retVal"]) {
            sna.push(data["retVal"][key]["sna"]);
            sbi.push(data["retVal"][key]["sbi"]);
        }

        sites = values[1];
        let coordinates = [];
        for (let key in sites["id"]) {
            coordinates.push(Object.values(sites["id"][key])[0]);
        }

        for (var i = 0; i < coordinates.length; i++) {
            coordinates[i] = projection(coordinates[i]);
        }

        // Draw Map

        draw_taipei(container, values[0]);

        console.log(voronoi(coordinates).polygons());
        draw_voronoi(container, coordinates);
        draw_non_taipei(container, values[0]);
        draw_boundaries(container, values[0]);
        draw_sites(container, coordinates);
    });

    // Draw Taiwan Map
    function draw_taipei(root, geojson_tw) {
        // Convert GeoJson to TopoJson Data
        taipei_features = topojson
            .feature(geojson_tw, geojson_tw.objects.TOWN_MOI_1090324)
            .features.filter(function (data) {
                return data.properties.COUNTYNAME == "臺北市";
            });

        // Draw Taipei
        let taipei = root
            .selectAll("path.taipei")
            .data(taipei_features)
            .enter()
            .append("path")
            .attr("class", "taipei")
            .attr("d", path)
            .attr("id", (data) => {
                return "city" + data.properties.TOWNID;
            });
    }

    function draw_sites(root, coordinates) {
        root.selectAll("_circle")
            .data(coordinates)
            .enter()
            .append("circle")
            .attr("class", "point")
            .attr("cx", (coord) => {
                return coord[0];
            })
            .attr("cy", (coord) => {
                return coord[1];
            })
            .attr("fill", "#b66")
            .attr("r", ".03em");
    }

    function draw_voronoi(root, coordinates) {
        root.selectAll("_path")
            .data(voronoi(coordinates).polygons())
            .enter()
            .append("path")
            .attr("class", "bound")
            .attr("d", polygon)
            .attr("stroke", voronoi_border_color)
            .attr("stroke-width", ".01em")
            .attr("cursor", "pointer")
            .attr("fill", voronoi_color)
            .on("mouseover", function () {
                d3.select(this).attr("fill", voronoi_hover_color);
            })
            .on("mouseout", function () {
                d3.select(this).attr("fill", voronoi_color);
            });

        function polygon(d) {
            return "M" + d.join("L") + "Z";
        }
    }

    function draw_non_taipei(root, geojson_tw) {
        non_taipei_features = topojson
            .feature(geojson_tw, geojson_tw.objects.TOWN_MOI_1090324)
            .features.filter(function (data) {
                return data.properties.COUNTYNAME != "臺北市";
            });

        root.selectAll("path.non-taipei")
            .data(non_taipei_features)
            .enter()
            .append("path")
            .attr("class", "non-taipei")
            .attr("d", path)
            .attr("fill", nontaipei_color);
    }

    function draw_boundaries(root, geojson_tw) {
        root.append("path")
            .datum(
                topojson.mesh(geojson_tw, geojson_tw.objects.TOWN_MOI_1090324)
            )
            .attr("d", path)
            .attr("class", "boundary")
            .attr("fill", "None")
            .attr("stroke", boundaries_color)
            .attr("stroke-width", "0.01em");
    }
}
