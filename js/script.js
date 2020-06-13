window.onload = main;

const voronoi_color = "transparent";
const voronoi_hover_color = "#639a67cc";
const voronoi_border_color = "#333";
const site_color = "brown";
const nontaipei_color = "#999";
const boundaries_color = "#dddd";
const background_color = "#e8e4e1";

function main() {
    var width = window.innerWidth,
        height = window.innerHeight;

    var svg = d3.select("svg");
    // var container = svg.append("g");

    var projection = d3
        .geoMercator()
        .center([121.5654, 25.085]) // 中心點(經緯度)
        .scale(width * 90) // 放大倍率
        .translate([width / 3, height / 2]) // 置中
        .precision(0.1);
    var path = d3.geoPath().projection(projection);
    var voronoi = d3.voronoi().size([width, height]);

    var map = new google.maps.Map(d3.select("#map").node(), {
        zoom: 12,
        center: new google.maps.LatLng(25.065, 121.5654),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
    });

    const zoom = d3
        .zoom()
        .scaleExtent([0.6, 100])
        .on("zoom", function zoomed() {
            svg.selectAll("g").attr("transform", d3.event.transform);
        });
    svg.call(zoom);

    // Data and color scale
    var colorScale = d3
        .scaleThreshold()
        .domain([100, 200, 400, 700, 1000, 1500, 2000])
        .range(d3.schemeBlues[7]);

    // External Files
    var files = ["data/TOWN_MOI_1090324.json", "data/taipei_ubike_sites.json"];

    Promise.all(files.map((url) => d3.json(url))).then(function (values) {
        d3.select("body").style("background-color", background_color);
        d3.select("#map").style("width", "100vw").style("height", "100vh");

        geojson_tw = values[0];
        sites_data = values[1];
        var sites = {
            coordinates: [],
            ids: [],
        };
        for (let key in sites_data) {
            let coordinate = sites_data[key].coordinate;
            sites.coordinates.push(projection(coordinate));
            sites.ids.push(key);
        }

        draw_google_map(sites_data);
        main();
        setInterval(main, 60000);

        // Start from here!
        function main() {
            d3.json(
                "https://tcgbusfs.blob.core.windows.net/blobyoubike/YouBikeTP.json"
            ).then(function (ubikes_data) {
                if (ubikes_data.retCode == 1) {
                    ubikes_data = ubikes_data.retVal;

                    // clear_all(container);
                    // draw_taipei(container, geojson_tw);
                    // draw_voronoi(container, sit es, ubikes_data);
                    // draw_non_taipei(container, geojson_tw);
                    // draw_boundaries(container, geojson_tw);
                    // draw_sites(container, sites.coordinates);
                    update_time();
                }
            });
        }
    });

    function draw_google_map(data) {
        var overlay = new google.maps.OverlayView();

        overlay.onAdd = function () {
            let layer = d3
                .select(this.getPanes().overlayLayer)
                .append("div")
                .attr("class", "svgoverlay");
            let svg = layer.append("svg");
            let svg_overlay = svg.append("g").attr("class", "admindivisions");
            let point_layer = svg_overlay.append("g");
            let voronoi_layer = svg_overlay.append("g");
            let overlay_projection = this.getProjection();

            let svg_width = svg.node().clientWidth;
            let svg_height = svg.node().clientHeight;
            let voronoi = d3.voronoi().size([svg_width + 1, svg_height + 1]);

            // map.addListener("mouseover", function (e) {
            //     // placeMarkerAndPanTo(e.latLng, map);
            //     console.log(e);
            // });

            overlay.draw = function () {
                let positions = [],
                    pos = [];
                d3.entries(data).forEach((d) => {
                    positions.push(google_map_projection(d.value.coordinate));
                    pos.push([d.value.coordinate[1], d.value.coordinate[0]]);
                });

                draw_voronoi(voronoi_layer, positions, voronoi);
                draw_sites(point_layer, positions);
            };

            // Transform Latitude and Longitude to Pixel Position
            function google_map_projection(coordinates) {
                let google_coordinates = new google.maps.LatLng(
                    coordinates[1],
                    coordinates[0]
                );
                let pixel_coordinates = overlay_projection.fromLatLngToDivPixel(
                    google_coordinates
                );
                return [pixel_coordinates.x + 2000, pixel_coordinates.y + 2000];
            }
        };

        overlay.setMap(map);
    }
}

// Draw Taiwan Map
function draw_taipei(root, geojson_tw) {
    // Convert GeoJson to TopoJson Data
    taipei_features = topojson
        .feature(geojson_tw, geojson_tw.objects.TOWN_MOI_1090324)
        .features.filter(function (data) {
            return data.properties.COUNTYNAME == "臺北市";
        });

    // Draw Taipei
    root.selectAll("path.taipei")
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
    let updatePoint = root.selectAll(".point").data(coordinates);
    let enterPoint = updatePoint
        .enter()
        .append("circle")
        .attr("class", "point")
        .attr("r", 1.5)
        .attr("fill", site_color)
        .attr("stroke", "black");

    updatePoint
        .merge(enterPoint)
        .attr("cx", (d) => d[0])
        .attr("cy", (d) => d[1]);
}

function draw_voronoi(root, sites, voronoi) {
    root.selectAll(".cell").remove();
    root.selectAll(".cell")
        .data(voronoi(sites).polygons())
        .enter()
        .append("path")
        .attr("class", "cell")
        .attr("fill", voronoi_color)
        .attr("stroke", voronoi_border_color)
        .attr("d", (d) => {
            if (!d) return null;
            return "M" + d.filter((df) => df != null).join("L") + "Z";
        })
        .style("z-index", 10)
        .attr("cursor", "help");

    // root.selectAll("_path")
    //     .data(voronoi(sites.coordinates).polygons())
    //     .enter()
    //     .append("path")
    //     .attr("class", "bound")
    //     .attr("d", polygon)
    //     .attr("stroke", voronoi_border_color)
    //     .attr("stroke-width", ".01em")
    //     .attr("cursor", "pointer")
    //     .attr("fill", voronoi_color)
    //     .on("mouseover", function (d, i) {
    //         let id = sites.ids[i];
    //         update_info(dict2text(ubikes_data[id]));
    //         d3.select(this).attr("fill", voronoi_hover_color);
    //     })
    //     .on("mouseout", function () {
    //         d3.select(this).attr("fill", voronoi_color);
    //     });
}

function dict2text(dict) {
    let sitename = dict.sna,
        totalslot = dict.tot,
        sitebike = dict.sbi,
        emptybike = dict.bemp,
        sitearea = dict.sarea;

    return (
        "名稱: " +
        sitename +
        "<br>" +
        "行政區: " +
        sitearea +
        "<br>" +
        "總停車格: " +
        totalslot +
        "<br>" +
        "可借車輛數: " +
        sitebike +
        "<br>" +
        "可還空位數: " +
        emptybike
    );
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
        .datum(topojson.mesh(geojson_tw, geojson_tw.objects.TOWN_MOI_1090324))
        .attr("d", path)
        .attr("class", "boundary")
        .attr("fill", "None")
        .attr("stroke", boundaries_color)
        .attr("stroke-width", "0.01em");
}

function update_info(content) {
    d3.select("#info .content").html(content);
}

function update_time() {
    var today = new Date();
    var current_time = today.getHours() + "點 " + today.getMinutes() + "分";
    d3.select("#info .datetime").html("資料更新時間: " + current_time);
}

function clear_all(root) {
    root.html("");
}
