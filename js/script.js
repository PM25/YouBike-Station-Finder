window.onload = main;

function main() {
    var width = window.innerWidth * 0.65,
        height = window.innerHeight;

    var svg = d3.select("svg");

    var projection = d3
        .geoMercator()
        .center([121.5654, 25.085]) // 中心點(經緯度)
        .scale(width * 150) // 放大倍率
        .translate([width / 2, height / 2]) // 置中
        .precision(0.1);
    var path = d3.geoPath().projection(projection);

    const zoom = d3.zoom().scaleExtent([0.8, 10]).on("zoom", zoomed);
    svg.call(zoom);

    d3.json("data/TOWN_MOI_1090324.json").then((taiwan) => {
        taiwan.features = topojson
            .feature(taiwan, taiwan.objects.TOWN_MOI_1090324)
            .features.filter(function (data) {
                // console.log(data.properties.COUNTYNAME);
                return data.properties.COUNTYNAME == "臺北市";
            });

        // Draw Towns
        svg.selectAll("path")
            .data(
                // topojson.feature(taiwan, taiwan.objects.TOWN_MOI_1090324)
                //     .features
                taiwan.features
            )
            .enter()
            .append("path")
            .attr("class", "town")
            .attr("d", path)
            .attr("id", (data) => {
                return "city" + data.properties.TOWNID;
            })
            .on("click", (data) => {
                document.querySelector(".info .content").innerHTML =
                    data.properties.TOWNNAME;
            });

        // Draw Boundary
        svg.append("path")
            .datum(
                topojson.mesh(
                    taiwan,
                    taiwan.objects.TOWN_MOI_1090324,
                    function (a, b) {
                        return (
                            a.properties.COUNTYNAME == "臺北市" ||
                            b.properties.COUNTYNAME == "臺北市"
                        );
                    }
                )
            )
            .attr("d", path)
            .attr("class", "boundary");
    });

    function zoomed() {
        svg.selectAll("path") // To prevent stroke width from scaling
            .attr("transform", d3.event.transform);
    }
}
