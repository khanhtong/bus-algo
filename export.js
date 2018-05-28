let output = require('./output/result.json');
let input = require('./data/finalData.json');

for (let i=0; i< output.length; i++) {
  for (let j=0; j<output[i].child.length; j++) {
    if (!output[i].child[j].element) {
      console.log(output[i].child[j])
    }
    output[i].child[j] = {
      distance: output[i].child[j].element.distance.text,
      duration: output[i].child[j].element.duration.text,
    }
  }
}


// let res = [];
// for (let i = 0; i < input.length; i++) {
//   res.push({
//     place: input[i].place,
//     format: input[i].geo.results[0].formatted_address,
//     code: input[i].code,
//     count: input[i].count,
//     duration: input[i].element.rows[0].elements[0].duration.text,
//     distance: input[i].element.rows[0].elements[0].distance.text,
//     lat: input[i].geo.results[0].geometry.location.lat,
//     long: input[i].geo.results[0].geometry.location.lng
//   })
// }
console.log(JSON.stringify(output));