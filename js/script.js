window.onload = main;

const voronoi_color = "transparent";
const voronoi_hover_color = "#639a67cc";
const voronoi_border_color = "#3336";
const voronoi_border_hover_color = "orange";
const site_color = "brown";
const site_hover_color = "orange";
const nontaipei_color = "#999";
const boundaries_color = "#dddd";
const background_color = "#e8e4e1";
const color_scale = d3
    .scaleThreshold()
    .domain([0, 5, 10, 20, 35, 55, 80])
    .range(d3.schemeRdBu[7]);

var show_type = null;
var current_marker = { index: null, marker: null };
var last_update = null;

function main() {
    var map = new google.maps.Map(d3.select("#map").node(), {
        zoom: 12,
        center: new google.maps.LatLng(25.065, 121.5654),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
    });

    // External Files
    var files = ["data/taipei_ubike_sites.json"];
    var ubikes_data = null,
        sites_data = null;

    Promise.all(files.map((url) => d3.json(url))).then(function (values) {
        d3.select("body").style("background-color", background_color);
        d3.select("#map").style("width", "100vw").style("height", "100vh");

        sites_data = values[0];

        draw_google_map(sites_data);
        update_data();
        setInterval(update_data, 60000);
        setInterval(update_time, 1000);
        enable_search();
        enable_controls();

        // Start from here!
        function update_data() {
            d3.json(
                "https://tcgbusfs.blob.core.windows.net/blobyoubike/YouBikeTP.json"
            ).then(function (data) {
                if (data.retCode == 1) {
                    ubikes_data = data.retVal;
                    last_update = new Date().getTime();
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
                let idx = diagram.find(coord[0], coord[1]).index;

                // d3.selectAll(".cell").attr("fill", "None");
                // d3.select("#cell" + idx).attr("fill", "#aaa6");
                d3.selectAll(".point").attr("r", 2).attr("fill", site_color);
                d3.select("#point" + idx)
                    .attr("r", 3)
                    .attr("fill", site_hover_color);
                d3.selectAll(".cell").attr("stroke", voronoi_border_color);
                d3.select("#cell" + idx).attr(
                    "stroke",
                    voronoi_border_hover_color
                );

                index2marker(idx);
                update_info(dict2text(index2data(idx)));
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

    function draw_sites(root, coordinates) {
        let updatePoint = root.selectAll(".point").data(coordinates);
        let enterPoint = updatePoint
            .enter()
            .append("circle")
            .attr("class", "point")
            .attr("r", 2)
            .attr("fill", site_color)
            .attr("stroke", "black")
            .attr("id", (d, i) => "point" + i);

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

        change_voronoi_color();
    }

    function change_voronoi_color(opacity = 0.5) {
        let opacity_hex = Math.floor(opacity * 255).toString(16);
        d3.selectAll(".cell").attr("fill", (d, i) => {
            if (index2data(i) != null && show_type != null) {
                return color_scale(index2data(i)[show_type]) + opacity_hex;
            } else {
                return "None";
            }
        });
    }

    function dict2text(dict) {
        if (dict != null) {
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
    }

    function update_info(content) {
        d3.select("#info .content").html(content);
    }

    function update_time() {
        let today = new Date();
        var current_time = today.getHours() + "點 " + today.getMinutes() + "分";
        let second_diff = Math.floor((today.getTime() - last_update) / 1000);
        d3.select("#info .datetime").html(
            "資料更新: " + current_time + "(" + second_diff + " 秒前)"
        );
    }

    function enable_search() {
        d3.select("#search-btn").on("click", function () {
            let address = d3.select("#search-bar").property("value");
            d3.json(
                "https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyCry-N7OmyPr5PK81akHssN7Z5SfHhKLh4&address=" +
                    encodeURI(address)
            ).then(function (data) {
                if (data.status == "OK") {
                    map.setCenter(data.results[0].geometry.location);
                    map.setZoom(15);
                }
            });
        });
    }

    function enable_controls() {
        d3.select("#total-btn").on("click", function () {
            show_type = "tot";
            change_voronoi_color();
        });
        d3.select("#bike-btn").on("click", function () {
            show_type = "sbi";
            change_voronoi_color();
        });
        d3.select("#empty-btn").on("click", function () {
            show_type = "bemp";
            change_voronoi_color();
        });
        d3.select("#none-btn").on("click", function () {
            show_type = null;
            change_voronoi_color();
        });

        ["total-btn", "bike-btn", "empty-btn", "none-btn"].forEach((id) => {
            d3.select("#" + id)
                .on("mouseover", function () {
                    d3.select(this).style("background-color", "#aaaa");
                })
                .on("mouseout", function () {
                    d3.select(this).style("background-color", "transparent");
                });
        });
    }

    function index2marker(index, title = "None") {
        if (index != current_marker.index) {
            current_marker.index = index;
            let data = index2data(current_marker.index);

            if (current_marker.marker != null) {
                current_marker.marker.setMap(null);
            }
            current_marker.marker = new google.maps.Marker({
                position: {
                    lat: parseFloat(data.lat),
                    lng: parseFloat(data.lng),
                },
                map: map,
                title: title,
            });
        }
    }

    function index2id(index) {
        if (sites_data != null) {
            return sites_data[index].key;
        } else {
            return null;
        }
    }

    function index2data(index) {
        if (ubikes_data != null) {
            return ubikes_data[index2id(index)];
        } else {
            return null;
        }
    }
}
