window.onload = main;

function main() {
    var width = 700,
        height = 500;

    var svg = d3
        .select("body")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    var projection = d3
        .geoMercator()
        // .center([122, 24])
        .center([121, 24]) // 中心點(經緯度)
        .scale(6000) // 放大倍率
        .translate([width / 2, height / 2.5]) // 置中
        .precision(0.1);
    var path = d3.geoPath().projection(projection);

    d3.json("data/TOWN_MOI_1090324.json").then((taiwan) => {
        // Draw Counties
        svg.selectAll("path")
            .data(
                topojson.feature(taiwan, taiwan.objects.TOWN_MOI_1090324)
                    .features
            )
            .enter()
            .append("path")
            .attr("class", "county")
            .attr("d", path)
            .attr("id", (data) => {
                return "city" + data.properties.TOWNID;
            })
            .on("click", (data) => {
                document.querySelector(".title").innerHTML =
                    data.properties.TOWNNAME;
            });

        // Draw Boundary
        svg.append("path")
            .attr(
                "d",
                path(
                    topojson.mesh(
                        taiwan,
                        taiwan.objects.TOWN_MOI_1090324,
                        function (a, b) {
                            return a !== b;
                        }
                    )
                )
            )
            .attr("class", "boundary");
    });
}
