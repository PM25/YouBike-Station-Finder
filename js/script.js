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

    const zoom = d3.zoom().scaleExtent([0.8, 10]).on("zoom", zoomed);
    svg.call(zoom);

    // d3.json("data/2020-04-11_21-29-13.json").then((data) => {
    //     console.log(data);
    // });

    d3.json("data/TOWN_MOI_1090324.json").then((taiwan) => {
        taipei = topojson
            .feature(taiwan, taiwan.objects.TOWN_MOI_1090324)
            .features.filter(function (data) {
                // console.log(data.properties.COUNTYNAME);
                return data.properties.COUNTYNAME == "臺北市";
            });

        non_taipei = topojson
            .feature(taiwan, taiwan.objects.TOWN_MOI_1090324)
            .features.filter(function (data) {
                // console.log(data.properties.COUNTYNAME);
                return data.properties.COUNTYNAME != "臺北市";
            });

        // Draw Taipei City
        svg.selectAll("path")
            .data(taipei)
            .enter()
            .append("path")
            .attr("class", "taipei")
            .attr("d", path)
            .attr("id", (data) => {
                return "city" + data.properties.TOWNID;
            })
            .on("click", (data) => {
                document.querySelector(".info .content").innerHTML =
                    data.properties.TOWNNAME;
            });

        // Draw Towns that is not Taipei
        svg.selectAll("path")
            .data(non_taipei)
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

    function zoomed() {
        svg.selectAll("path") // To prevent stroke width from scaling
            .attr("transform", d3.event.transform);
    }
}
