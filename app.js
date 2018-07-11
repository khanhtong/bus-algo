const fs = require('fs');
const perf = require('execution-time')();
const Json2csvParser = require('json2csv').Parser;
const _ = require('lodash');
const data = require('./data/finalData.json');
const buses = [29, 16, 7];
const maxTime = 3600;
const bufferTime = 1;
const timeForPickup = 60;
const largeTime = 1.5;
const minTime = 1200;

function checkCondition(route, place, nextDistance) {
  // kiem tra thoi gian tong < thoi gian yeu cau
  let newTime = route.duration
    + nextDistance.element.duration.value * bufferTime
    + place.element.rows[0].elements[0].duration.value * bufferTime;
  if (newTime < maxTime) {
    if (newTime > minTime) {
      // check tung diem khong vuot qua yeu cau
      for (let i = 0; i < route.element.length; i++) {
        let rs = newTime;
        for (let j = 0; j < i; j++) {
          rs = rs - (route.child[j].element.duration.value * bufferTime + timeForPickup);
        }
        route.element[i].bufferDuration = rs;
        if ((rs) > (route.element[i].durationToScore * bufferTime) * largeTime) {
          return false;
        }
      }
      return true;
    }
    else {
      return true;
    }
  }
  else return false;
}

function main() {
  perf.start();
  // sort theo khoang cach lon nhat
  let input = _.sortBy(data, [function (o) {
    return o.element.rows[0].elements[0].duration.value;
  }]);

  let output = [];

// nhung dia chi da su dung
  let donePlace = [];

  while (input.length > donePlace.length) {
    let donePlaceChild = []; // danh sach dia diem da xong trong route hien tai
    donePlaceChild = donePlace.slice();
    let route = {
      element: [],
      duration: 0,
      distance: 0,
      child: [],
      bus: 0,
      count: 0
    };

    let inputRaw = [];
    for (let i = 0; i < input.length; i++) {
      if (donePlace.indexOf(input[i].code) === -1) {
        inputRaw.push(input[i])
      }
    }
    let lastPlaceIndex = inputRaw.length - 1;

    // lay vi tri xa nhat
    let lastPlace = inputRaw[lastPlaceIndex];
    let bus = buses[0];

    // neu so hs lon hon xe
    if (lastPlace.count >= bus) {
      route.count = bus;
      lastPlace.count -= bus;
      bus = 0;
      route.element.push({
        place: lastPlace.place,
        index: lastPlace.code,
        geo: lastPlace.geo.results[0].formatted_address,
        count: route.count,
        durationToScore: lastPlace.element.rows[0].elements[0].duration.value
      });
      route.duration += timeForPickup;
    }
    else {
      route.element.push({
        place: lastPlace.place,
        index: lastPlace.code,
        geo: lastPlace.geo.results[0].formatted_address,
        count: lastPlace.count,
        durationToScore: lastPlace.element.rows[0].elements[0].duration.value
      });
      route.duration += timeForPickup;
      route.count += lastPlace.count;
      bus -= lastPlace.count;
      donePlace.push(lastPlace.code);
      donePlaceChild.push(lastPlace.code)
    }

    let breakPoint = false;

    //  khi bus chua day hoac chua qua time toi da
    while (bus >= 1 && input.length > donePlaceChild.length && !breakPoint) {

      // lay danh sach khoang cach tu diem cuoi toi cac diem khac
      let distances = require('./data/distances_raw3/' + route.element[route.element.length - 1].index + '.json');
      let distancesLength = distances.elements.length;
      let distancesRaw = []; // danh sach khoang cach sau khi xoa nhung dia diem da chon

      // xoa nhung dia diem da dc su dung
      for (let i = 0; i < distancesLength; i++) {
        if (donePlace.indexOf(distances.elements[i].code) === -1 && donePlaceChild.indexOf(distances.elements[i].code) === -1) {
          distancesRaw.push(distances.elements[i])
        }
      }

      // khi van con dia diem co the chon
      if (distancesRaw.length > 0) {
        // tim khoang cach ngan nhat
        let nearestPlace = _.minBy(distancesRaw, function (o) {
          return o.element.duration.value;
        });
        // tim dia diem tu khoang cach ngan nhat
        let nearestPlaceRaw = _.find(inputRaw, function (o) {
          return o.code === nearestPlace.code;
        });
        // kiem tra thoi gian khong vuot cho moi diem
        let cd = checkCondition(route, nearestPlaceRaw, nearestPlace);

        if (cd) {
          // so luong nguoi tai diem nho hon so ghe con lai cua xe
          if (bus >= nearestPlaceRaw.count) {
            route.child.push(nearestPlace);
            route.duration = route.duration + timeForPickup + nearestPlace.element.duration.value * bufferTime;
            route.distance += nearestPlace.element.distance.value;

            donePlaceChild.push(nearestPlaceRaw.code);

            route.count += nearestPlaceRaw.count;
            bus -= nearestPlaceRaw.count;
            donePlace.push(nearestPlaceRaw.code);
            route.element.push({
              place: nearestPlaceRaw.place,
              index: nearestPlaceRaw.code,
              geo: nearestPlaceRaw.geo.results[0].formatted_address,
              count: nearestPlaceRaw.count,
              durationToScore: nearestPlaceRaw.element.rows[0].elements[0].duration.value
            });
          }
          else {
            donePlaceChild.push(nearestPlaceRaw.code);
          }

        }
        else {
          breakPoint = true;
        }
      }
      else {
        breakPoint = true;
      }
    }
    if (route.count <= buses[0]) {
      route.type = 0;
    }
    if (route.count <= buses[1]) {
      route.type = 1;
    }
    if (route.count <= buses[2]) {
      route.type = 2;
    }
    route.bus = buses[route.type] - route.count;
    let lastItem = _.last(route.element);
    let lastItemRaw = _.find(input, function (o) {
      return o.code === lastItem.index
    });
    route.distance += lastItemRaw.element.rows[0].elements[0].distance.value;
    route.duration += lastItemRaw.element.rows[0].elements[0].duration.value;
    route.distance = route.distance / 1000;
    route.duration = route.duration / 60;
    route.child.push({
      destination: lastItemRaw.element.destination_addresses[0],
      element: {
        distance: lastItemRaw.element.rows[0].elements[0].distance,
        duration: lastItemRaw.element.rows[0].elements[0].duration
      }
    });
    output.push(route)
  }


  // formnat
  let resBus = [];
  for (let i = 0; i < buses.length; i++) {
    resBus.push({
      value: buses[i],
      count: 0
    })
  }
  // count number of bus
  for (let i = 0; i < output.length; i++) {
    resBus[output[i].type].count ++;
  }
  // format data to export excel
  for (let i = 0; i < output.length; i++) {
    for (let j = 0; j < output[i].child.length; j++) {
      if (!output[i].child[j].element) {
        console.log(output[i].child[j])
      }
      output[i].child[j] = {
        distance: output[i].child[j].element.distance.text,
        duration: output[i].child[j].element.duration.text,
        place: output[i].element[j].place,
        count: output[i].element[j].count,
        geo: output[i].element[j].geo,
        index: output[i].element[j].index,
      }
    }
  }

  output = _.sortBy(output, [function (o) {
    return o.duration;
  }])

  console.log(resBus);
  console.log(JSON.stringify(output));
  console.log('Number of bus: ', output.length);
  const results = perf.stop();
  console.log('Time: ', results.time);
  // exportCsv(output)
}

function setTime(output) {

}

function exportCsv(output) {
  const fields = [
    {
      label: 'Code',
      value: 'child.index'
    },
    {
      label: 'Địa điểm input',
      value: 'child.place'
    },
    {
      label: 'Số người đón tại điểm',
      value: 'child.count'
    },
    {
      label: 'Khoảng cách tới chặng kế',
      value: 'child.distance'
    },
    {
      label: 'Thời gian tới chặng kế',
      value: 'child.duration'
    },
    {
      label: 'Tổng khoảng cách',
      value: 'distance'
    },
    {
      label: 'Tổng thời gian',
      value: 'duration'
    },
    {
      label: 'Số lượng ghế còn lại',
      value: 'bus'
    },
    {
      label: 'Số người đón',
      value: 'count'
    },
    {
      label: 'Loại xe',
      value: 'type'
    }
  ];
  const json2csvParser = new Json2csvParser({fields, unwind: ['element', 'child'], unwindBlank: true});
  const csv = json2csvParser.parse(output);
  fs.writeFile('output/10%Buffer60sDelay2.csv', "\uFEFF" + csv, 'utf8', function (err) {
    console.log('err: ', err);
  });
}

main();
