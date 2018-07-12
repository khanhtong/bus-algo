let input = require('./data/geoSuccess.json');
const async = require('async');
const Json2csvParser = require('json2csv').Parser;
const fs = require('fs');

function exportInput() {
  let result = [];
  console.log(input.length)
  for (let i=0; i<input.length; i++) {
    let item = {};
    item.place = input[i].place;
    item.count = input[i].count;
    item.child = [];
    if (!input[i].geo) {
      console.log(input[i])
    }
    for (let j=0; j<input[i].geo.results.length; j++) {
      item.child.push({
        formatted_address: input[i].geo.results[j].formatted_address,
        long_lat: input[i].geo.results[j].geometry.location.lat + ', ' + input[i].geo.results[j].geometry.location.lng
      })
    }

    result.push(item);
  }
  console.log(JSON.stringify(result));
  const fields = [
    {
      label: 'Địa điểm input',
      value: 'place'
    },
    {
      label: 'Số người đón tại điểm',
      value: 'count'
    },
    {
      label: 'Kết quả trên google',
      value: 'child.formatted_address'
    },
    {
      label: 'Long lat',
      value: 'child.long_lat'
    }
  ];
  const json2csvParser = new Json2csvParser({fields, unwind: ['child'], unwindBlank: true});
  const csv = json2csvParser.parse(result);
  fs.writeFile('output/input.csv', "\uFEFF" + csv, 'utf8', function (err) {
    console.log('err: ', err);
  });

}


exportInput()