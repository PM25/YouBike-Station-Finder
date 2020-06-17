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
    .domain([1, 5, 10, 20, 35, 55, 80])
    .range(d3.schemeRdBu[7]);

var show_type = null;
var current_marker = { index: null, marker: null };
var search_marker = null;
var last_update = null;

function main() {
    var map = new google.maps.Map(d3.select("#map").node(), {
        zoom: 12,
        center: new google.maps.LatLng(25.065, 121.5654),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
    });

    // External Files
    var files = [
        "https://tcgbusfs.blob.core.windows.net/blobyoubike/YouBikeTP.json",
    ];
    var ubikes_data = null,
        sites_data = null;

    // Start from here!
    Promise.all(files.map((url) => d3.json(url))).then(function (values) {
        d3.select("body").style("background-color", background_color);
        d3.select("#map").style("width", "100vw").style("height", "100vh");

        if (values[0].retCode == 1) {
            ubikes_data = values[0].retVal;
            sites_data = get_sitesdata(ubikes_data);
            last_update = new Date();

            setInterval(update_data, 60000);
            setInterval(update_time, 1000);
            draw_google_map(sites_data);
            enable_search();
            enable_controls();
            add_legend(d3.select("#legend"));
        }

        function update_data() {
            d3.json(
                "https://tcgbusfs.blob.core.windows.net/blobyoubike/YouBikeTP.json"
            ).then(function (data) {
                if (data.retCode == 1) {
                    ubikes_data = data.retVal;
                    last_update = new Date();
                }
            });
        }
    });

    function get_sitesdata(ubikes_data) {
        let sites_data = [];
        d3.entries(ubikes_data).forEach((data) => {
            sites_data.push({
                key: data.key,
                coordinate: [data.value.lng, data.value.lat],
            });
        });

        return sites_data;
    }

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
        var last_update_time =
            last_update.getHours() + "點 " + last_update.getMinutes() + "分";
        let second_diff = Math.floor(
            (new Date().getTime() - last_update.getTime()) / 1000
        );
        d3.select("#info .datetime").html(
            "資料更新: " + last_update_time + "(" + second_diff + " 秒前)"
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
                    draw_marker(data.results[0].geometry.location);
                }
            });
        });
    }

    function enable_controls() {
        d3.select("#total-btn").on("click", function () {
            show_type = "tot";
            change_voronoi_color();
            update_btns();
        });
        d3.select("#bike-btn").on("click", function () {
            show_type = "sbi";
            change_voronoi_color();
            update_btns();
        });
        d3.select("#empty-btn").on("click", function () {
            show_type = "bemp";
            change_voronoi_color();
            update_btns();
        });
        d3.select("#none-btn").on("click", function () {
            show_type = null;
            change_voronoi_color();
            update_btns();
        });
    }

    function update_btns() {
        d3.selectAll(".btn").style("background-color", "transparent");
        if (show_type == null) {
            d3.select("#none-btn").style("background-color", "#aaaa");
        } else if (show_type == "tot") {
            d3.select("#total-btn").style("background-color", "#aaaa");
        } else if (show_type == "sbi") {
            d3.select("#bike-btn").style("background-color", "#aaaa");
        } else if (show_type == "bemp") {
            d3.select("#empty-btn").style("background-color", "#aaaa");
        }
    }

    function index2marker(index, title = "YouBike 站點") {
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

    function draw_marker(data, title = "Search Result") {
        if (search_marker != null) {
            search_marker.setMap(null);
        }
        search_marker = new google.maps.Marker({
            position: {
                lat: parseFloat(data.lat),
                lng: parseFloat(data.lng),
            },
            map: map,
            title: title,
            icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        });
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

    function add_legend(root) {
        const width = root.node().clientWidth;
        const length = color_scale.range().length;

        const x = d3
            .scaleLinear()
            .domain([1, length - 1])
            .rangeRound([width / length, (width * (length - 1)) / length]);

        root.selectAll("rect")
            .data(color_scale.range())
            .join("rect")
            .attr("height", 8)
            .attr("x", (d, i) => x(i))
            .attr("width", (d, i) => x(i + 1) - x(i))
            .attr("fill", (d) => d);

        root.call(
            d3
                .axisBottom(x)
                .tickSize(5)
                .tickFormat((i) => color_scale.domain()[i - 1])
                .tickValues(d3.range(1, length))
        )
            .select(".domain")
            .remove();
    }
}
