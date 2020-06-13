window.onload = main;

const voronoi_color = "transparent";
const voronoi_hover_color = "#639a67cc";
const voronoi_border_color = "#3336";
const site_color = "brown";
const nontaipei_color = "#999";
const boundaries_color = "#dddd";
const background_color = "#e8e4e1";

function main() {
    var map = new google.maps.Map(d3.select("#map").node(), {
        zoom: 12,
        center: new google.maps.LatLng(25.065, 121.5654),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
    });

    // External Files
    var files = ["data/TOWN_MOI_1090324.json", "data/taipei_ubike_sites.json"];
    var ubikes_data = null;

    Promise.all(files.map((url) => d3.json(url))).then(function (values) {
        d3.select("body").style("background-color", background_color);
        d3.select("#map").style("width", "100vw").style("height", "100vh");

        geojson_tw = values[0];
        sites_data = values[1];

        draw_google_map(sites_data);
        main();
        setInterval(main, 60000);

        // Start from here!
        function main() {
            d3.json(
                "https://tcgbusfs.blob.core.windows.net/blobyoubike/YouBikeTP.json"
            ).then(function (data) {
                if (data.retCode == 1) {
                    ubikes_data = data.retVal;
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
            let diagram = voronoi(get_positions());

            overlay.draw = function () {
                let positions = get_positions();
                diagram = voronoi(positions);

                draw_voronoi(voronoi_layer, diagram.polygons());
                draw_sites(point_layer, positions);
            };

            map.addListener("mousemove", function (mapsMouseEvent) {
                let lat = mapsMouseEvent.latLng.lat(),
                    lng = mapsMouseEvent.latLng.lng();
                let coord = google_map_projection([lng, lat]);
                let id = diagram.find(coord[0], coord[1]).index;

                d3.selectAll(".cell").attr("fill", "None");
                d3.select("#cell" + id).attr("fill", "#aaa6");
                update_info(dict2text(ubikes_data[data[id].key]));
            });

            // Get all sites' position in pixel coordinates
            function get_positions() {
                let positions = [];
                d3.entries(data).forEach((d) => {
                    positions.push(google_map_projection(d.value.coordinate));
                });

                return positions;
            }

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

function draw_voronoi(root, polygons) {
    root.selectAll(".cell").remove();
    root.selectAll(".cell")
        .data(polygons)
        .enter()
        .append("path")
        .attr("class", "cell")
        .attr("fill", voronoi_color)
        .attr("stroke", voronoi_border_color)
        .attr("d", (d) => {
            if (!d) return null;
            return "M" + d.filter((df) => df != null).join("L") + "Z";
        })
        .attr("id", (d, i) => "cell" + i);
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

function update_info(content) {
    d3.select("#info .content").html(content);
}

function update_time() {
    var today = new Date();
    var current_time = today.getHours() + "點 " + today.getMinutes() + "分";
    d3.select("#info .datetime").html("資料更新時間: " + current_time);
}
